const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalise les accents
};

// Fonction de récupération des utilisateurs
const getUsers = async (req, res) => {
  const querySaisi = req.query.query;
  if (!querySaisi) {
    return res.status(400).send({ error: 'Le paramètre query est requis' });
  }

  try {
    let utilisateurs = [];

    // Requête dans /eperson/epersons/search/byMetadata
    const fetchUsers = async (query) => {
      const response = await axios.get(`${config.DSPACE_API_URL}/eperson/epersons/search/byMetadata?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': req.dspaceAuthToken,
          'Cookie': req.dspaceCookies,
        },
      });
      return response.data._embedded?.epersons || [];
    };

    // Effectuer la première recherche
    let epersons = await fetchUsers(querySaisi);

    // Structurer les résultats
    utilisateurs = epersons.map(user => {
      const firstname = user.metadata?.['eperson.firstname']?.[0]?.value || 'N/A';
      const lastname = user.metadata?.['eperson.lastname']?.[0]?.value || 'N/A';
      return {
        id: user.uuid,
        email: user.email,
        fullName: `${firstname} ${lastname}`,
      };
    });

    // Si aucun utilisateur trouvé, effectuer une recherche dans /discover/search/objects
    if (utilisateurs.length === 0) {
      const discoverResponse = await axios.get(`${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(querySaisi)},contains`, {
        headers: {
          'Authorization': req.dspaceAuthToken,
          'Cookie': req.dspaceCookies,
        },
      });
      const objects = discoverResponse.data._embedded?.searchResult?._embedded?.objects || [];

      const uniqueUsers = new Set();
      const additionalUsers = objects.map((obj) => {
        const item = obj._embedded?.indexableObject;
        const metadata = item?.metadata || {};
        const author = metadata['dc.contributor.author']?.[0]?.value || 'N/A';
        const [lastname, firstname] = author.split(',').map(part => part.trim());
        const userId = `N/A${author}`;

        if (!uniqueUsers.has(userId)) {
          uniqueUsers.add(userId);
          return {
            id: userId,
            email: 'N/A', // L'email n'est pas disponible ici
            fullName: `${firstname} ${lastname}`,
          };
        }
        return null;
      }).filter(user => user !== null);  // Éliminer les doublons

      utilisateurs.push(...additionalUsers);
    }

    // Recherche avec les accents retirés
    if (utilisateurs.length === 0) {
      const stringSansAccent = removeAccents(querySaisi);
      const epersonsSansAccent = await fetchUsers(stringSansAccent);

      utilisateurs = epersonsSansAccent.map(user => {
        const firstname = user.metadata?.['eperson.firstname']?.[0]?.value || 'N/A';
        const lastname = user.metadata?.['eperson.lastname']?.[0]?.value || 'N/A';
        const uuid = `N/A-${user.uuid}`;
        return {
          id: uuid,
          email: user.email,
          fullName: `${firstname} ${lastname}`,
        };
      });
    }

    res.json({ utilisateurs });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

module.exports = {
  getUsers,
};

const fetchItems = async (url, headers) => {
  try {
    const response = await axios.get(url, { headers });
    return response.data._embedded || {};
  } catch (error) {
    logger.warn(`Erreur lors de la récupération des données depuis ${url}: ${error.message}`);  // Correction de la syntaxe des backticks
    return {};
  }
};

const enrichItems = async (items, headers) => {
  return Promise.all(
    items.map(async (item) => {
      const itemLink = item._links?.item?.href;
      const idCollection = item.sections?.collection || null;
      let itemDetails = {};

      if (itemLink) {
        try {
          const itemResponse = await axios.get(itemLink, { headers });
          itemDetails = itemResponse.data;
        } catch (err) {
          logger.warn(`Erreur lors de la récupération des détails pour l'item ${item.id}: ${err.message}`);  // Correction de la syntaxe des backticks
        }
      }

      const metadata = itemDetails?.metadata || {};
      return {
        id: itemDetails?.id || null,
        title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
        description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
        lastModified: item.lastModified || 'Date de modification non disponible',
        submissionDate: metadata['dc.date.submitted']?.[0]?.value || 'Date de soumission non disponible',
        idCollection,
      };
    })
  );
};

const getUserItems = async (req, res) => {
  const userId = req.query.userId;
  const filtreAuthor = encodeURIComponent(req.query.fullName);
  const headers = {
    Authorization: req.dspaceAuthToken,
    Cookie: req.dspaceCookies,
  };

  if (!userId) {
    return res.status(400).send({ error: 'Le paramètre userId est requis' });
  }

  try {
    let enrichedWorkflowItems = [];
    let enrichedWorkspaceItems = [];

    if (!userId.includes('N/A')) {
      // Récupération des workflows et workspaces
      const { workflowitems = [] } = await fetchItems(
        `${config.DSPACE_API_URL}/workflow/workflowitems/search/findBySubmitter?uuid=${userId}`,  // Correction des backticks
        headers
      );

      const { workspaceitems = [] } = await fetchItems(
        `${config.DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userId}`,  // Correction des backticks
        headers
      );

      enrichedWorkflowItems = await enrichItems(workflowitems, headers);
      enrichedWorkspaceItems = await enrichItems(workspaceitems, headers);
    }

    // Récupérer les autres items liés à l'utilisateur
    let userItemsResponse = await fetchItems(
      `${config.DSPACE_API_URL}/discover/search/objects?f.author=${filtreAuthor},equals`,  // Correction des backticks
      headers
    );

    let objects = userItemsResponse.searchResult?._embedded?.objects || [];

    // Si aucun résultat, essayer avec l'inversion Prénom/Nom
    if (objects.length === 0) {
      const decodedAuthor = decodeURIComponent(filtreAuthor);
      const nameParts = decodedAuthor.split(' ');
      const reversedAuthor = nameParts.length === 2 ? `${nameParts[1]}, ${nameParts[0]}` : decodedAuthor;

      userItemsResponse = await fetchItems(
        `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(reversedAuthor)},equals`,  // Correction des backticks
        headers
      );
      objects = userItemsResponse.searchResult?._embedded?.objects || [];
    }

    // Mapper les objets
    const userItems = objects.map((obj) => {
      const item = obj._embedded?.indexableObject;
      const metadata = item?.metadata || {};
      return {
        id: item?.id || null,
        title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
        description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
        lastModified: item?.lastModified || 'Date de modification non disponible',
        submissionDate: metadata['dc.date.accessioned']?.[0]?.value || 'Date de soumission non disponible',
      };
    });

    res.json({
      workflowItems: enrichedWorkflowItems,
      workspaceItems: enrichedWorkspaceItems,
      userItems,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des items:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des items' });
  }
};

const getItemDetails = async (req, res) => {
  const itemId = req.query.itemId;
  if (!itemId) {
    return res.status(400).send({ error: 'L\'identifiant de l\'item est requis' });
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items/${itemId}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      },
    });

    const data = response.data;

    // Construire l'objet de sortie
    const formattedItem = {
      id: data.id,
      name: data.name,
      author: data.metadata['dc.contributor.author'] || [],
      dateAccessioned: data.metadata['dc.date.accessioned']?.[0]?.value || null,
      description: data.metadata['dc.description']?.[0]?.value || null,
      provenance: data.metadata['dc.description.provenance'] || [],
      type: data.metadata['dc.type']?.[0]?.value || null,
      uri: data.metadata['dc.identifier.uri']?.[0]?.value || null,
      lng: data.metadata['dc.language.iso']?.[0]?.value || null,
      discipline: data.metadata['etd.degree.discipline']?.[0]?.value || null,
      level: data.metadata['etd.degree.level']?.[0]?.value || null,
      handle: data.handle,
      inArchive: data.inArchive,
      discoverable: data.discoverable,
      itemType: data.type,
      lastModified: data.lastModified,
    };

    res.json(formattedItem);
  } catch (error) {
    logger.error('Erreur lors de la récupération des détails de l\'item:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des détails de l\'item' });
  }
};

module.exports = {
  getUserItems,
  getUsers,
  getItemDetails
};
