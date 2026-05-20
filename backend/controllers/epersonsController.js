const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Fonction de récupération des utilisateurs
const getUsers = async (req, res) => {
  const queryParams = req.query;

  if (!queryParams || Object.keys(queryParams).length === 0) {
    return res.status(400).send({ error: 'Le paramètre query est requis' });
  }

  try {
    let utilisateurs = [];
    let errorsMetadata = [];

    const { nom, prenom, email } = queryParams;
    let searchQueries = [];

    if (nom) {
      searchQueries.push(`${removeAccents(nom)}`);
    }
    if (prenom) {
      searchQueries.push(`${removeAccents(prenom)}`);
    }
    if (email) {
      searchQueries.push(`${email}`);
    }
    const querySaisi = searchQueries.join('&').toString();

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

    let epersons = await fetchUsers(querySaisi);

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

    utilisateurs = utilisateurs.filter(user => {
      const nomLower = nom ? removeAccents(nom.toLowerCase()) : null;
      const prenomLower = prenom ? removeAccents(prenom.toLowerCase()) : null;
      const fullNameLower = removeAccents(user.fullName.toLowerCase());

      const nomMatch = !nomLower || fullNameLower.includes(nomLower);

      let prenomMatch = !prenomLower;
      if (prenomLower) {
        const prenomParts = prenomLower.split(/\s+/);
        prenomMatch = prenomParts.some(part => {
          return part.length > 1 && fullNameLower.includes(part);
        });
      }

      if (!nomMatch || !prenomMatch) {
        errorsMetadata.push(`Veuillez vérifier les informations.`);
      }
      return nomMatch && prenomMatch;
    });

    if (utilisateurs.length === 0) {
      const browseResponse = await axios.get(`${config.DSPACE_API_URL}/discover/browses/author/items?filterValue=${encodeURIComponent(removeAccents(querySaisi))}`, {
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

    // AMÉLIORATION: Recherche par mots individuels dans discover/search/objects
    if (utilisateurs.length === 0) {
      // IMPORTANT: Décoder l'URL d'abord pour gérer les %20 (espaces encodés)
      const decodedQuery = decodeURIComponent(querySaisi);
      const normalizedQuery = removeAccents(decodedQuery);
      logger.info(`Recherche par mots séparés pour: ${normalizedQuery}`);
      
      // Séparer les mots de la recherche (supporte & et espaces)
      const searchWords = normalizedQuery.replace(/&/g, ' ').split(/\s+/).filter(w => w.length > 0);
      logger.info(`Mots de recherche: ${JSON.stringify(searchWords)}`);
      
      const allFoundUsers = new Map();
      
      // STRATÉGIE 1: Rechercher la chaîne complète d'abord (pour noms composés exacts)
      const fullSearchString = searchWords.join(' ');
      logger.info(`  Recherche avec chaîne complète: "${fullSearchString}"`);
      try {
        const fullSearchResponse = await axios.get(
          `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(fullSearchString)},contains`, {
          headers: {
            'Authorization': req.dspaceAuthToken,
            'Cookie': req.dspaceCookies,
          },
        });
        const fullSearchObjects = fullSearchResponse.data._embedded?.searchResult?._embedded?.objects || [];
        logger.info(`    Trouvé ${fullSearchObjects.length} résultats avec chaîne complète`);
        
        fullSearchObjects.forEach((obj) => {
          const item = obj._embedded?.indexableObject;
          const metadata = item?.metadata || {};
          const authors = metadata['dc.contributor.author'] || [];
          
          authors.forEach(authorObj => {
            const author = authorObj.value;
              const authorNormalized = removeAccents(author.toLowerCase()).replace(/,/g, '').replace(/\s+/g, ' ');
              const searchNormalized = removeAccents(fullSearchString.toLowerCase()).replace(/\s+/g, ' ');
              
              // Vérifier si la chaîne complète est présente (accents normalisés)
            if (authorNormalized.includes(searchNormalized)) {
              if (!allFoundUsers.has(author)) {
                allFoundUsers.set(author, { author, matchedWords: new Set(searchWords.map(w => w.toLowerCase())) });
                logger.info(`    ✓ Match complet trouvé: "${author}"`);
              }
            }
          });
        });
      } catch (err) {
        logger.warn(`Erreur recherche chaîne complète:`, err.message);
      }
      
      // STRATÉGIE 2: Rechercher chaque mot individuellement (PERMISSIF: au moins UN mot)
      logger.info(`  Recherche par mots individuels (mode permissif)`);
      
      for (const word of searchWords) {
        logger.info(`    Recherche du mot: "${word}"`);
        try {
          const discoverResponse = await axios.get(
            `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(word)},contains`, {
            headers: {
              'Authorization': req.dspaceAuthToken,
              'Cookie': req.dspaceCookies,
            },
          });
          const objects = discoverResponse.data._embedded?.searchResult?._embedded?.objects || [];
          logger.info(`      Trouvé ${objects.length} résultats pour "${word}"`);
          
          objects.forEach((obj) => {
            const item = obj._embedded?.indexableObject;
            const metadata = item?.metadata || {};
            const authors = metadata['dc.contributor.author'] || [];
            
            // DEBUG: Afficher tous les auteurs trouvés
            if (authors.length > 0 && word === searchWords[0]) {
              logger.info(`      Auteurs trouvés pour "${word}": ${JSON.stringify(authors.map(a => a.value))}`);
            }
            
            authors.forEach(authorObj => {
              const author = authorObj.value;
              const authorNormalized = removeAccents(author.toLowerCase()).replace(/,/g, '').replace(/\s+/g, ' ');
              const wordNormalized = removeAccents(word.toLowerCase());
              
              // Vérifier si le mot est vraiment présent dans l'auteur (accents normalisés)
              if (authorNormalized.includes(wordNormalized)) {
                if (!allFoundUsers.has(author)) {
                  allFoundUsers.set(author, { author, matchedWords: new Set() });
                }
                allFoundUsers.get(author).matchedWords.add(wordNormalized);
              }
            });
          });
        } catch (err) {
          logger.warn(`Erreur recherche pour "${word}":`, err.message);
        }
      }
      
      // STRATÉGIE 3: Recherche générale avec query= si toujours rien
      if (allFoundUsers.size === 0) {
        logger.info(`  Tentative avec recherche générale query=`);
        try {
          const querySearchResponse = await axios.get(
            `${config.DSPACE_API_URL}/discover/search/objects?query=${encodeURIComponent(fullSearchString)}`, {
            headers: {
              'Authorization': req.dspaceAuthToken,
              'Cookie': req.dspaceCookies,
            },
          });
          
          const queryObjects = querySearchResponse.data._embedded?.searchResult?._embedded?.objects || 
                              querySearchResponse.data._embedded?.objects || [];
          logger.info(`    Trouvé ${queryObjects.length} résultats avec query=`);
          
          queryObjects.forEach((obj) => {
            const item = obj._embedded?.indexableObject;
            const metadata = item?.metadata || {};
            const authors = metadata['dc.contributor.author'] || [];
            
            authors.forEach(authorObj => {
              const author = authorObj.value;
              const authorNormalized = removeAccents(author.toLowerCase()).replace(/,/g, '').replace(/\s+/g, ' ');
              
              // MODE PERMISSIF: Au moins UN mot doit être présent (accents normalisés)
              const hasAtLeastOneWord = searchWords.some(word => 
                authorNormalized.includes(removeAccents(word.toLowerCase()))
              );
              
              if (hasAtLeastOneWord) {
                if (!allFoundUsers.has(author)) {
                  // Compter combien de mots sont présents
                  const matchedWords = new Set();
                  searchWords.forEach(word => {
                    if (authorNormalized.includes(removeAccents(word.toLowerCase()))) {
                      matchedWords.add(removeAccents(word.toLowerCase()));
                    }
                  });
                  
                  allFoundUsers.set(author, { author, matchedWords });
                  logger.info(`    ✓ Match trouvé avec query=: "${author}" (mots: ${Array.from(matchedWords).join(', ')})`);
                }
              }
            });
          });
        } catch (err) {
          logger.warn(`Erreur recherche query=:`, err.message);
        }
      }
      
      // VALIDATION PERMISSIVE: Au moins UN mot doit correspondre (au lieu de TOUS)
      const validAuthors = Array.from(allFoundUsers.values())
        .filter(entry => entry.matchedWords.size >= 1);  // Au moins 1 mot au lieu de tous
      
      logger.info(`Auteurs validés (contenant au moins un mot): ${validAuthors.length}`);
      validAuthors.forEach(entry => {
        logger.info(`  ✓ ${entry.author} - Mots trouvés: ${Array.from(entry.matchedWords).join(', ')}`);
      });
      
      const additionalUsers = validAuthors.map(entry => {
        const author = entry.author;
        const [lastname, firstname] = author.split(',').map(part => part.trim());
        return {
          id: `N/A-${author}`,
          email: 'N/A',
          fullName: `${firstname || 'N/A'}, ${lastname || 'N/A'}`,
          errorsMetadata: errorsMetadata
        };
      });
      
      utilisateurs.push(...additionalUsers);
    }

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
          logger.warn(`Erreur lors de la récupération des détails pour l'item ${item.id}: ${err.message}`);
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

    // RECHERCHE PAR SOUMETTEUR: si on a un vrai UUID, chercher directement par submitter
    let objects = [];
    if (!userId.includes('N/A')) {
      const submitterResponse = await fetchItems(
        `${config.DSPACE_API_URL}/discover/search/objects?f.submitter=${userId},authority&size=100`,
        headers
      );
      objects = submitterResponse.searchResult?._embedded?.objects || [];
      if (objects.length > 0) {
        logger.info(`Recherche par submitter UUID ${userId}: ${objects.length} items trouvés`);
      }
    }

    // Fallback par nom d'auteur si la recherche par submitter n'a rien donné
    let userItemsResponse = {};
    if (objects.length === 0) {
      userItemsResponse = await fetchItems(
        `${config.DSPACE_API_URL}/discover/search/objects?f.author=${filtreAuthor},contains`,
        headers
      );
    }

    if (objects.length === 0) {
      objects = userItemsResponse.searchResult?._embedded?.objects || [];
    }

    // TENTATIVE 1: Si aucun résultat, inverser le format du nom
    if (objects.length === 0) {
      const decodedAuthor = decodeURIComponent(filtreAuthor);
      const nameParts = decodedAuthor.split(',');
      const reversedAuthor = nameParts.length === 2 ? `${nameParts[1].trim()}, ${nameParts[0].trim()}` : decodedAuthor;

      userItemsResponse = await fetchItems(
        `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(reversedAuthor)},contains`,
        headers
      );
      objects = userItemsResponse.searchResult?._embedded?.objects || [];

      // TENTATIVE 2: Recherche avec première partie du prénom
      if (objects.length === 0) {
        const decodedAuthor = decodeURIComponent(reversedAuthor);
        
        let namePrenomPart1 = '';
        
        if (decodedAuthor.includes(',')) {
          const parts = decodedAuthor.split(',');
          const nomComplet = parts[0]?.trim() || '';
          const prenomComplet = parts[1]?.trim() || '';
          
          const prenomPart1 = prenomComplet.split(/\s+/)[0]?.trim() || '';
          
          namePrenomPart1 = nomComplet + ', ' + prenomPart1;
        } else {
          namePrenomPart1 = decodedAuthor;
        }
        
        if (namePrenomPart1) {
          const encodedSearch = encodeURIComponent(namePrenomPart1);
          const searchUrl = `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodedSearch},contains`;
          
          userItemsResponse = await fetchItems(searchUrl, headers);
          objects = userItemsResponse.searchResult?._embedded?.objects || [];
        }
      }
    }

    // TENTATIVE 3: Recherche par mots individuels avec validation stricte
    if (objects.length === 0) {
      try {
        const decodedAuthor = decodeURIComponent(filtreAuthor);
        logger.info(`Recherche par mots individuels pour: "${decodedAuthor}"`);
        
        // Séparer tous les mots (enlever virgules et espaces multiples)
        const nameParts = decodedAuthor.replace(/,/g, ' ').split(/\s+/).filter(p => p.length > 1);
        logger.info(`Mots à rechercher: ${JSON.stringify(nameParts)}`);
        
        const allResults = new Map();
        
        // Rechercher chaque mot individuellement
        for (const part of nameParts) {
          logger.info(`  Recherche avec mot: "${part}"`);
          const partResponse = await fetchItems(
            `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(part)},contains`,
            headers
          );
          const partResults = partResponse.searchResult?._embedded?.objects || [];
          logger.info(`    Trouvé: ${partResults.length} résultats`);
          
          partResults.forEach(item => {
            const itemId = item?._embedded?.indexableObject?.id;
            if (itemId && !allResults.has(itemId)) {
              allResults.set(itemId, item);
            }
          });
        }
        
        const candidateObjects = Array.from(allResults.values());
        logger.info(`Total candidats combinés: ${candidateObjects.length}`);
        
        // Validation: correspondance classique OU auteur partiel contenant au moins le nom de famille
        const nameParts3 = decodedAuthor.split(',').map(p => p.trim());
        const lastnameWords3 = (nameParts3.length >= 2 ? nameParts3[nameParts3.length - 1] : nameParts3[0])
          .toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const searchWords3 = decodedAuthor.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);

        objects = candidateObjects.filter(obj => {
          const item = obj._embedded?.indexableObject;
          const metadata = item?.metadata || {};
          const authors = metadata['dc.contributor.author'] || [];

          return authors.some(author => {
            const authorValue = author.value.toLowerCase().trim();
            const authorWords = authorValue.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);

            // Match classique: tous les mots de recherche présents dans l'auteur
            const searchSubsetOfAuthor = searchWords3.every(sw => authorValue.includes(sw));
            // Match partiel: auteur contient au moins un mot du nom de famille ET tous ses mots sont dans la recherche
            const authorContainsLastname = lastnameWords3.some(lw => authorWords.some(aw => aw === lw));
            const authorSubsetOfSearch = authorContainsLastname && authorWords.every(aw => searchWords3.includes(aw));

            const isMatch = searchSubsetOfAuthor || authorSubsetOfSearch;
            if (isMatch) logger.info(`✓ Validation réussie: "${author.value}" correspond à "${decodedAuthor}"`);
            return isMatch;
          });
        });
        
        logger.info(`Après validation: ${objects.length} résultats`);
        
      } catch (searchError) {
        logger.warn('Recherche par mots échouée:', searchError.message);
      }
    }

    // RECHERCHE ADMIN DYNAMIQUE avec plusieurs stratégies
    let adminSearchItems = [];
    if (objects.length === 0) {
      try {
        const decodedAuthor = decodeURIComponent(filtreAuthor);
        logger.info(`Début recherche admin pour: "${decodedAuthor}"`);
        
        // Fonction pour effectuer une recherche admin
        const performAdminSearch = async (query) => {
          const searchUrl = `${config.DSPACE_API_URL}/discover/search/objects?query=${encodeURIComponent(query)}`;
          logger.info(`Recherche URL: ${searchUrl}`);
          const response = await fetchItems(searchUrl, headers);
          const results = response?._embedded?.searchResult?._embedded?.objects ||
                         response?._embedded?.objects ||
                         response?.searchResult?._embedded?.objects ||
                         response?.objects ||
                         [];
          logger.info(`Résultats trouvés: ${results.length}`);
          return results;
        };
        
        // Validation: correspondance classique OU auteur partiel contenant au moins le nom de famille
        const validateItemAuthor = (item, authorName) => {
          try {
            const metadata = item?._embedded?.indexableObject?.metadata || {};
            const authors = metadata['dc.contributor.author'] || [];
            const searchName = authorName.toLowerCase().trim();
            const nameParts = authorName.split(',').map(p => p.trim());
            const lastnameWords = (nameParts.length >= 2 ? nameParts[nameParts.length - 1] : nameParts[0])
              .toLowerCase().split(/\s+/).filter(w => w.length > 0);
            const searchWords = searchName.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);

            return authors.some(author => {
              const authorValue = author.value.toLowerCase().trim();
              const authorWords = authorValue.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);

              // Match classique: tous les mots de recherche présents dans l'auteur
              const searchSubsetOfAuthor = searchWords.every(sw =>
                authorWords.some(aw => aw.includes(sw) || sw.includes(aw))
              );
              // Match partiel: auteur contient au moins un mot du nom de famille ET tous ses mots sont dans la recherche
              const authorContainsLastname = lastnameWords.some(lw => authorWords.some(aw => aw === lw));
              const authorSubsetOfSearch = authorContainsLastname && authorWords.every(aw => searchWords.includes(aw));

              const isMatch = searchSubsetOfAuthor || authorSubsetOfSearch;
              if (isMatch) logger.info(`✓ Match trouvé: "${authorValue}" correspond à "${authorName}"`);
              return isMatch;
            });
          } catch (error) {
            logger.warn('Erreur validation auteur:', error.message);
            return false;
          }
        };
        
        let validatedAdminItems = [];
        const nameParts = decodedAuthor.replace(/,/g, ' ').split(/\s+/).filter(p => p.length > 0);
        
        // STRATÉGIE 1: Recherche avec chaque mot individuellement, puis validation stricte
        logger.info(`Stratégie 1: Recherche par mots individuels (${nameParts.length} mots)`);
        const allResults = new Map();
        
        for (const part of nameParts) {
          logger.info(`  Recherche du mot: "${part}"`);
          const partResults = await performAdminSearch(part);
          partResults.forEach(item => {
            const itemId = item?._embedded?.indexableObject?.id;
            if (itemId && !allResults.has(itemId)) {
              allResults.set(itemId, item);
            }
          });
        }
        
        adminSearchItems = Array.from(allResults.values());
        logger.info(`Total résultats combinés: ${adminSearchItems.length}`);
        
        // Validation stricte: TOUS les mots doivent être présents
        validatedAdminItems = adminSearchItems.filter(item => 
          validateItemAuthor(item, decodedAuthor)
        );
        
        logger.info(`Après validation stricte: ${validatedAdminItems.length} items`);
        
        // STRATÉGIE 2: Si échec, essayer avec le nom complet
        if (validatedAdminItems.length === 0) {
          logger.info(`Stratégie 2: Recherche avec nom complet`);
          adminSearchItems = await performAdminSearch(decodedAuthor);
          validatedAdminItems = adminSearchItems.filter(item => 
            validateItemAuthor(item, decodedAuthor)
          );
          logger.info(`Résultats stratégie 2: ${validatedAdminItems.length} items`);
        }
        
        // STRATÉGIE 3: Si échec et format "Nom, Prénom", inverser
        if (validatedAdminItems.length === 0 && decodedAuthor.includes(',')) {
          logger.info(`Stratégie 3: Inversion du nom`);
          const parts = decodedAuthor.split(',').map(p => p.trim());
          if (parts.length === 2) {
            const reversedName = `${parts[1]} ${parts[0]}`;
            logger.info(`  Nom inversé: "${reversedName}"`);
            adminSearchItems = await performAdminSearch(reversedName);
            validatedAdminItems = adminSearchItems.filter(item => 
              validateItemAuthor(item, decodedAuthor)
            );
            logger.info(`Résultats stratégie 3: ${validatedAdminItems.length} items`);
          }
        }
        
        if (validatedAdminItems.length > 0) {
          objects = validatedAdminItems;
          logger.info(`✓ Recherche admin réussie: ${validatedAdminItems.length} items validés pour "${decodedAuthor}"`);
        } else {
          logger.warn(`✗ Aucun résultat trouvé pour "${decodedAuthor}"`);
        }
        
      } catch (adminError) {
        logger.error('Recherche admin échouée:', adminError.message);
        logger.error('Stack:', adminError.stack);
      }
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