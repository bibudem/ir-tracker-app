import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PagesRoutingModule } from './pages-routing.module';
import {HomeComponent} from "./home/home.component";
import {TranslateModule} from "@ngx-translate/core";



@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    NgbModule,
    TranslateModule
  ]
})
export class PagesModule { }
