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


  afficherDetailsItem(itemId: string): void {
    if (this.loadingDetails || this.selectedItemDetails?.id === itemId) {
      return;
    }
    this.selectedItemDetails = null;
    this.loadingDetails = true;

    this.dspaceService.getItemDetails(itemId).subscribe(
      (data) => {
        this.selectedItemDetails = data;
        this.loadingDetails = false;
      },
      (error) => {
        this.loadingDetails = false;
        console.error('Erreur lors de la récupération des détails de l’item:', error);
      }
    );
  }


  getNameCollection(itemId: string, collectionId: string): void {
    this.collectionData.getNameCollection(itemId, collectionId).subscribe(
      (collectionName) => {
        this.collectionNames[itemId] = collectionName; // Met à jour le nom de la collection pour l'item donné
      },
      (error) => {
        console.error('Erreur lors de la récupération du nom de la collection:', error);
      }
    );
  }


  /**
   * Basculer l'affichage des détails pour une ligne spécifique.
   * @param id - L'identifiant de l'item ou de l'utilisateur.
   */
  toggleRow(id: string, idCollection: string): void {
    if (this.expandedRows[id]) {
      this.expandedRows = {};
      this.selectedItemDetails = null;
    } else {
      this.expandedRows = { [id]: true };
      if (!this.selectedItemDetails || this.selectedItemDetails.id !== id) {
        this.afficherDetailsItem(id);
        this.getNameCollection(id, idCollection);
      }
    }
  }


  resetSearch(): void {
    this.resultItems = [];
    this.indexQuery = '';
    this.indexQuery = null;
    this.showAlert = false;
  }
}
