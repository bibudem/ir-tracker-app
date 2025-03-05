const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalise les accents
};


// Fonction de récupération des utilisateurs
const getUsers = async (req, res) => {
  const queryParams = req.query;
  //console.log("Paramètres reçus:", queryParams);

  if (!queryParams || Object.keys(queryParams).length === 0) {
    return res.status(400).send({ error: 'Le paramètre query est requis' });
  }

  try {
    let utilisateurs = [];
    let errorsMetadata = [];

    // Utiliser directement les paramètres reçus pour la recherche par metadata
    const { nom, prenom, email } = queryParams;
    let searchQueries = [];

    if (nom) {
      searchQueries.push(`${nom}`);
    }
    if (prenom) {
      searchQueries.push(`${prenom}`);
    }
    if (email) {
      searchQueries.push(`${email}`);
    }
    const querySaisi = searchQueries.join('&').toString();

    //console.log(`Query String utilisée : ${querySaisi}`);

    const fetchUsers = async (query) => {
      let allUsers = [];
      let page = 0;
      let totalPages = 1;

      while (page < totalPages) {
        const response = await axios.get(`${config.DSPACE_API_URL}/eperson/epersons/search/byMetadata?query=${query}&page=${page}&size=20`, {
          headers: {
            'Authorization': req.dspaceAuthToken,
            'Cookie': req.dspaceCookies,
          },
        });
        const data = response.data;
        allUsers = allUsers.concat(data._embedded?.epersons || []);
        totalPages = data.page.totalPages;
        page++;
      }
      return allUsers;
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
        fullName: `${firstname}, ${lastname}`,
        errorsMetadata:errorsMetadata
      };
    });

    // Vérification supplémentaire : comparer le nom et prénom avec les métadonnées
    utilisateurs = utilisateurs.filter(user => {
      const nomLower = nom ? nom.toLowerCase() : null;
      const prenomLower = prenom ? prenom.toLowerCase() : null;
      const fullNameLower = user.fullName.toLowerCase();

      const nomMatch = !nomLower || fullNameLower.includes(nomLower);
      const prenomMatch = !prenomLower || fullNameLower.includes(prenomLower);

      if (!nomMatch || !prenomMatch) {
        errorsMetadata.push(`Veuillez vérifier les informations.`);
      }
      return nomMatch && prenomMatch;
    });

    // Si aucun utilisateur trouvé, effectuer une recherche dans /discover/browses/author
    if (utilisateurs.length === 0) {
      const browseResponse = await axios.get(`${config.DSPACE_API_URL}/discover/browses/author/items?filterValue=${encodeURIComponent(querySaisi)}`, {
        headers: {
          'Authorization': req.dspaceAuthToken,
          'Cookie': req.dspaceCookies,
        },
      });
      const browseObjects = browseResponse.data._embedded?.items || [];

      const browseUsers = browseObjects.map((item) => {
        const metadata = item.metadata || {};
        const author = metadata['dc.contributor.author']?.[0]?.value || 'N/A';
        const [lastname, firstname] = author.split(',').map(part => part.trim());
        return {
          id:  `N/A-${author}`,
          email: 'N/A',
          fullName: `${firstname}, ${lastname}`,
          errorsMetadata: errorsMetadata
        };
      });
      utilisateurs.push(...browseUsers);
    }

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
            fullName: `${firstname}, ${lastname}`,
            errorsMetadata:errorsMetadata
          };
        }
        return null;
      }).filter(user => user !== null);
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
          fullName: `${firstname}, ${lastname}`,
          errorsMetadata:errorsMetadata
        };
      });
    }
    res.json({ utilisateurs });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};

const fetchItems = async (url, headers) => {
  try {
    const response = await axios.get(`${url}&page=0&size=100`, { headers });
    return response.data._embedded || {};
  } catch (error) {
    logger.warn(`Erreur lors de la récupération des données depuis ${url}: ${error.message}`);  
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
      const { workflowitems = [] } = await fetchItems(
        `${config.DSPACE_API_URL}/workflow/workflowitems/search/findBySubmitter?uuid=${userId}`,
        headers
      );

      const { workspaceitems = [] } = await fetchItems(
        `${config.DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userId}`,
        headers
      );

      enrichedWorkflowItems = await enrichItems(workflowitems, headers);
      enrichedWorkspaceItems = await enrichItems(workspaceitems, headers);
    }

    let userItemsResponse = await fetchItems(
      `${config.DSPACE_API_URL}/discover/search/objects?f.author=${filtreAuthor},contains`,
      headers
    );

    let objects = userItemsResponse.searchResult?._embedded?.objects || [];

    if (objects.length === 0) {
      const decodedAuthor = decodeURIComponent(filtreAuthor);
      const nameParts = decodedAuthor.split(',');
      const reversedAuthor = nameParts.length === 2 ? `${nameParts[1]}, ${nameParts[0]}` : decodedAuthor;

      userItemsResponse = await fetchItems(
        `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(reversedAuthor)},contains`,
        headers
      );
      objects = userItemsResponse.searchResult?._embedded?.objects || [];
    }

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

    let browseItemsResponse = await fetchItems(
      `${config.DSPACE_API_URL}/discover/browses/author/items?filterValue=${filtreAuthor}`,
      headers
    );

    let browseObjects = browseItemsResponse?.items || [];

    if (browseObjects.length === 0) {
      const decodedAuthor = decodeURIComponent(filtreAuthor);
      const nameParts = decodedAuthor.split(',');
      if (nameParts.length === 2) {
        const reversedAuthor = `${nameParts[1].trim()}, ${nameParts[0].trim()}`;
        browseItemsResponse = await fetchItems(
          `${config.DSPACE_API_URL}/discover/browses/author/items?filterValue=${encodeURIComponent(reversedAuthor)}`,
          headers
        );
        browseObjects = browseItemsResponse?.items || [];
      }
    }

    const browseItems = browseObjects.map((item) => {
      const metadata = item?.metadata || {};
      return {
        id: item?.id || null,
        title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
        description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
        lastModified: item?.lastModified || 'Date de modification non disponible',
        submissionDate: metadata['dc.date.accessioned']?.[0]?.value || 'Date de soumission non disponible',
      };
    });

    const itemSet = new Map();
    [...userItems, ...browseItems].forEach(item => {
      if (!itemSet.has(item.id)) {
        itemSet.set(item.id, item);
      }
    });

    const allUserItems = Array.from(itemSet.values());

    res.json({
      workflowItems: enrichedWorkflowItems,
      workspaceItems: enrichedWorkspaceItems,
      userItems: allUserItems,
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
