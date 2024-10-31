import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from "./home/home.component";
import {CollectionComponent} from "./collection/collection.component";
import {DiscoverComponent} from "./discover/discover.component";



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
        path: 'collection',
        component: CollectionComponent,
        data: {
          title: 'Collection'
        }
      },
      {
        path: 'discover',
        component: DiscoverComponent,
        data: {
          title: 'Déposant'
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
