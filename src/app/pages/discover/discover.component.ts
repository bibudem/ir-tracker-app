import { Component, OnInit } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { CollectionData } from '../../core/collection.data';
import { Utils } from '../../utils/utils';
import {Subscription} from "rxjs";

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss'
})
export class DiscoverComponent implements OnInit{
  indexQuery: string = '';
  resultItems: any[] = [];
  selectedItemDetails: any = null;
  collectionNames: { [key: string]: string } = {};
  expandedRows: { [key: string]: boolean } = {};
  collectionSubscription: Subscription;

  showAlert = false;
  alertMessage = '';
  isLoading = false;
  loadingDetails = false;

  urlDSpace = environment.urlDSpace + '/items/';
  utils: Utils = new Utils();

  constructor(
    private dspaceService: DSpaceService,
    private collectionData: CollectionData,
    public translate: TranslateService
  ) {}

  ngOnInit(): void {}

/**
 * Effectue une recherche d'items en fonction de la requête entrée
 */
  rechercher(): void {
    if (!this.indexQuery.trim()) return;
    this.isLoading = true;
    this.resultItems = [];

    this.dspaceService.getItemsByIndex(this.indexQuery).subscribe(
      (data) => {
        //console.log(data);
        this.isLoading = false;
        if (data?._embedded?.objects) {
          this.resultItems = data._embedded.objects.map(obj => obj._embedded.indexableObject);
        } else {
          this.resultItems = [];
        }
        this.showAlert = this.resultItems.length === 0;
      },
      (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la récupération des items:', error);
      }
    );
  }

/**
 * Réinitialise la recherche et les résultats
 */
  resetSearch(): void {
    this.resultItems = [];
    this.indexQuery = '';
    this.indexQuery = null;
    this.showAlert = false;
  }
}
