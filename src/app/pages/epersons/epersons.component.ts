import { Component, OnInit } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-epersons',
  templateUrl: './epersons.component.html',
  styleUrls: ['./epersons.component.scss'],
})
export class EpersonsComponent implements OnInit {
  // Recherche utilisateur
  query = { email: '', nom: '', prenom: '' };

  // Résultats de la recherche
  result: any[] = [];
  resultItems: any[] = [];
  selectedItemDetails: any = null;

  // Données complémentaires
  collectionNames: { [key: string]: string } = {};
  expandedRows: { [key: string]: boolean } = {};

  // États de chargement et messages
  showAlert = false;
  alertMessage = '';
  isLoading = false;
  loadingDetails = false;

  // Données spécifiques
  urlDSpace = environment.urlDSpace + '/items/';
  selectedUserId: string | null = null;
  searchQueryString: string = '';

  constructor(
    private dspaceService: DSpaceService,
    public translate: TranslateService
  ) {}

  ngOnInit(): void {}

  /**
   * Rechercher les utilisateurs en fonction des critères saisis.
   * Crée une requête basée sur les champs remplis et affiche les résultats.
   */
  rechercher(): void {
    const queryStr = [this.query.email, this.query.nom, this.query.prenom]
      .filter((value) => value?.trim())
      .join('&');

    this.searchQueryString = queryStr;

    if (!queryStr) return;

    this.isLoading = true;
    this.dspaceService.getPersonnes(queryStr).subscribe(
      (data) => {
        this.isLoading = false;
        this.result = data.utilisateurs || [];
        this.showAlert = this.result.length === 0;

        if (this.showAlert) {
          this.translate.get('searchNoResults', { query: queryStr }).subscribe((res: string) => {
            this.alertMessage = res;
          });
        }
      },
      (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la récupération des utilisateurs:', error);
      }
    );
  }

  /**
   * Charger les items associés à un utilisateur spécifique.
   * Met à jour les items affichés en fonction de l'utilisateur sélectionné.
   * @param userId - L'identifiant de l'utilisateur.
   */
  afficherItems(userId: string): void {
    this.selectedUserId = userId;
    this.resultItems = [];
    this.selectedItemDetails = null;
    this.isLoading = true;

    this.dspaceService.getUserItems(userId).subscribe(
      (data) => {
        this.resultItems = data.items || [];
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la récupération des items:', error);
      }
    );
  }

  /**
   * Afficher les détails d'un item spécifique.
   * Met à jour l'affichage avec les détails de l'item sélectionné.
   * @param itemId - L'identifiant de l'item.
   */
  afficherDetailsItem(itemId: string): void {
    this.selectedItemDetails = null;
    this.loadingDetails = true;

    this.dspaceService.getItemDetails(itemId).subscribe(
      (data) => {
        this.selectedItemDetails = data;
        console.log(data);
        this.loadingDetails = false;
      },
      (error) => {
        this.loadingDetails = false;
        console.error('Erreur lors de la récupération des détails de l’item:', error);
      }
    );
  }

  /**
   * Obtenir le nom de la collection associée à un item.
   * Stocke le nom de la collection pour un usage ultérieur.
   * @param itemId - L'identifiant de l'item.
   */
  getNameCollection(itemId: string): void {
    this.dspaceService.getMappedCollection(itemId).subscribe({
      next: (names) => {
        this.collectionNames[itemId] = names;
      },
      error: (error) => {
        console.error('Erreur lors de la récupération des collections', error);
      },
    });
  }

  /**
   * Réinitialiser le formulaire de recherche et effacer les résultats.
   */
  resetForm(): void {
    this.query = { email: '', nom: '', prenom: '' };
    this.result = [];
    this.resultItems = [];
    this.selectedItemDetails = null;
    this.showAlert = false;
    this.isLoading = false;
  }

  /**
   * Basculer l'affichage des détails pour une ligne spécifique.
   * @param id - L'identifiant de l'item ou de l'utilisateur.
   */
  toggleRow(id: string): void {
    this.expandedRows[id] = !this.expandedRows[id];
  }
}
