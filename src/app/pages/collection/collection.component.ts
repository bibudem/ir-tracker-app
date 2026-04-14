import {Component, OnInit} from '@angular/core';
import { TranslateService } from "@ngx-translate/core";
import { DSpaceService } from "../../services/dspace.service";

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss'
})
export class CollectionComponent implements OnInit{
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
