import { Component, OnInit } from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  collections: any[] = [];

  constructor(private dspaceService: DSpaceService, public translate: TranslateService) { }

  ngOnInit(): void {
    this.dspaceService.getCollections().subscribe((data: any) => {
      this.collections = data._embedded.collections;
    }, error => {
      console.error('Erreur lors de la récupération des collections : ', error);
    });
  }
}
