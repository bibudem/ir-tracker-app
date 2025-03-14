import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { PagesRoutingModule } from './pages-routing.module';
import {HomeComponent} from "./home/home.component";
import {TranslateModule} from "@ngx-translate/core";
import {CollectionComponent} from "./collection/collection.component";
import {EpersonsComponent} from "./epersons/epersons.component";
import {RapportsComponent} from "./rapports/rapports.component";
import { LoginComponent } from './login/login.component';
import {DiscoverComponent} from "./discover/discover.component";
import {AdminListComponent} from "./admin-list/admin-list.component";

@NgModule({
  declarations: [
    HomeComponent,
    CollectionComponent,
    EpersonsComponent,
    RapportsComponent,
    DiscoverComponent,
    AdminListComponent,
    LoginComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    NgbModule,
    TranslateModule,
    FormsModule
  ]
})
export class PagesModule { }
