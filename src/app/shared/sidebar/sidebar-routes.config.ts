import { RouteInfo } from './sidebar.metadata';

//Sidebar menu Routes and data
export const ROUTES: RouteInfo[] = [
   {
        path: '/home', title: 'Accueil', icon: 'bi bi-house-door', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
    },
  {     path: '/eperson', title: 'Déposant', icon: 'bi bi-person-check', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },
  /*{     path: '/collection', title: 'Collection', icon: 'bi bi-collection', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },*/
  {     path: '/rapports', title: 'Rapports', icon: 'bi bi-bar-chart', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []
  },
  /*{     path: '/faq', title: 'FAQ', icon: 'bi bi-exclamation-triangle', class: '', badge: '', badgeClass: '', isExternalLink: false, submenu: []}*/
];
