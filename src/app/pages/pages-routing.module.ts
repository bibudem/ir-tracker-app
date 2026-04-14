import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from "./home/home.component";
import {EpersonsComponent} from "./epersons/epersons.component";
import {RapportsComponent} from "./rapports/rapports.component";
import {DiscoverComponent} from "./discover/discover.component";
import {AdminListComponent} from "./admin-list/admin-list.component";



const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'home',
        component: HomeComponent,
        data: {
          title: 'Accueil'
        }
      },
      {
        path: 'eperson',
        component: EpersonsComponent,
        data: {
          title: 'Déposant'
        }
      },
      {
        path: 'discover',
        component: DiscoverComponent,
        data: {
          title: 'Découvrir'
        }
      },
      {
        path: 'rapports',
        component: RapportsComponent,
        data: {
          title: 'Rapports'
        }
      },
      {
        path: 'gestionnaires',
        component: AdminListComponent,
        data: {
          title: 'Groupes de validation'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
