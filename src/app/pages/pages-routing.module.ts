import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {HomeComponent} from "./home/home.component";
import {CollectionComponent} from "./collection/collection.component";
import {EpersonsComponent} from "./epersons/epersons.component";



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
        path: 'eperson',
        component: EpersonsComponent,
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
