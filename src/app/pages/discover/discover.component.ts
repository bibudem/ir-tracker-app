import {Component, OnInit} from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss'
})
export class DiscoverComponent implements OnInit {
  result: any[] = [];
  collectionNames: string[] = [];
  showAlert: boolean = false;
  alertMessage: string = '';
  isLoading: boolean = false;

  query: { courriel: string, nom: string, prenom: string } = {
    courriel: '',
    nom: '',
    prenom: ''
  };

  // Nouvel état pour suivre les lignes ouvertes/fermées
  expandedRows: { [key: string]: boolean } = {};

  constructor(private dspaceService: DSpaceService, public translate: TranslateService) { }

  ngOnInit(): void { }

  rechercher(): void {
    const queryStr = `${this.query.courriel} ${this.query.nom} ${this.query.prenom}`.trim();

    if (!queryStr) {
      return; // Ne pas exécuter de requête si les champs sont vides
    }

    this.isLoading = true; // Début du chargement

    this.dspaceService.getAuthor(queryStr).subscribe(
      (data) => {
        this.isLoading = false; // Fin du chargement
        const embeddedObjects = data._embedded?.searchResult?._embedded?.objects || [];
        this.result = embeddedObjects.map((object: any) => {
          const indexableObject = object?._embedded?.indexableObject;
          return indexableObject ? indexableObject : null;
        }).filter(item => item !== null);

        if (!this.result.length) {
          this.showAlert = true;
          this.translate.get('searchNoResults', { query: queryStr }).subscribe((res: string) => {
            this.alertMessage = res;
          });
        } else {
          this.showAlert = false;
        }
      },
      (error) => {
        this.isLoading = false; // Fin du chargement même en cas d'erreur
        console.error('Erreur lors de la récupération des données:', error);
      }
    );
  }

  // Fonction pour basculer l'affichage des lignes
  toggleRow(id: string): void {
    this.expandedRows[id] = !this.expandedRows[id];
  }

  getNameCollections(itemId: string) {
    this.dspaceService.getMappedCollections(itemId).subscribe({
      next: (names) => {
        this.collectionNames[itemId] = names;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des collections', error);
      },
    });
  }

  getFormattedProvenance(provenance: any[]): string[] {
    return provenance?.map(entry => entry.value) || [];
  }

  // Fonction pour réinitialiser le formulaire et les résultats
  resetForm() {
    this.query = {
      courriel: '',
      nom: '',
      prenom: ''
    };
    this.result = [];
    this.showAlert = false;
    this.isLoading = false;
  }
}
