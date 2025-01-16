import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from "./home/home.component";
import {CollectionComponent} from "./collection/collection.component";
import {EpersonsComponent} from "./epersons/epersons.component";
import {RapportsComponent} from "./rapports/rapports.component";



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
      /*{
        path: 'collection',
        component: CollectionComponent,
        data: {
          title: 'Collection'
        }
      },*/
      {
        path: 'eperson',
        component: EpersonsComponent,
        data: {
          title: 'Déposant'
        }
      },
      {
        path: 'rapports',
        component: RapportsComponent,
        data: {
          title: 'Rapports'
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
