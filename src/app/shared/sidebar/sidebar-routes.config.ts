import { RouteInfo } from './sidebar.metadata';

//Sidebar menu Routes and data
export const ROUTES: RouteInfo[] = [
   {
        path: '/home', title: 'Accueil', icon: 'bi bi-house-door', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
    },
  {     path: '/eperson', title: 'Suivi des soumissions', icon: 'bi bi-person-bounding-box', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },
  /*{     path: '/collection', title: 'Collection', icon: 'bi bi-collection', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },*/
  {     path: '/discover', title: 'Recherche dans l\'index', icon: 'bi bi-view-list', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },
  // Sous-menu "Rapports" (ajouté le 2026-09-08) : ancien rapport de workflow + nouveau rapport TME
  {     path: '/rapports', title: 'Rapports', icon: 'bi bi-bar-chart', class: 'sub', badge: '', badgeClass: '', isExternalLink: false, submenu: [
        { path: '/rapports', title: 'Suivi des soumissions', icon: '', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: [] },
        { path: '/rapports/theses-en-attente', title: 'TME en attente', icon: '', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: [] },
      ]
  },
  {     path: '/gestionnaires', title: 'Groupes de validation', icon: 'bi bi-gear-wide-connected', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },

  /*{     path: '/faq', title: 'FAQ', icon: 'bi bi-exclamation-triangle', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []}*/
];
