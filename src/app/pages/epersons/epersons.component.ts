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
  query = { email: '', nom: '', prenom: '' };
  result: any[] = [];
  resultItemsWorkflow: any[] = [];
  resultItems: any[] = [];
  resultItemsCombined: any[] = [];
  selectedItemDetails: any = null;
  collectionNames: { [key: string]: string } = {};
  expandedRows: { [key: string]: boolean } = {};

  showAlert = false;
  alertMessage = '';
  isLoading = false;
  loadingDetails = false;

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
    this.result = [];
    const queryStr = [this.query.email, this.query.nom, this.query.prenom]
      .filter((value) => value?.trim())  // On filtre les champs vides
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
    this.resultItemsCombined = []; // Réinitialisation des items combinés
    this.selectedItemDetails = null;
    this.isLoading = true;
    this.expandedRows = {};

    this.dspaceService.getUserItems(userId).subscribe(
      (data) => {
        if (data.workflowItems.length === 0 && data.userItems.length === 0) {
          this.alertMessage = 'Aucun élément n\'est associé à ce compte.';
          this.showAlert = true;
          this.isLoading = false;
        } else {
          this.showAlert = false;
          this.alertMessage = '';
          this.resultItemsWorkflow = data.workflowItems || [];
          this.resultItems = data.userItems || [];

          // Combine les deux listes d'items
          this.resultItemsCombined = [
            ...this.resultItemsWorkflow,
            ...this.resultItems
          ];
          this.isLoading = false;
        }
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
    // Protection contre l'appel multiple pour le même item
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

  /**
   * Calculer la progression d'une étape de workflow.
   * @param stepId - L'identifiant de l'étape.
   * @returns Un objet avec l'étiquette de l'étape et la progression en pourcentage.
   */
  getStepProgress(stepId: string): { label: string, progress: string } {
    const steps = ['reviewstep', 'editstep', 'finaleditstep'];
    const stepIndex = steps.indexOf(stepId);

    if (stepIndex === -1) {
      return { label: 'Unknown', progress: '0.00' };
    }

    const progress = ((stepIndex + 1) / steps.length) * 100;
    return { label: steps[stepIndex], progress: progress.toFixed(2) };
  }

  /**
   * Obtenir le nom de la collection associée à un item.
   * @param itemId - L'identifiant de l'item.
   */
  getNameCollection(itemId: string): void {
    // On vérifie si la propriété 'name' existe dans la réponse avant de l'utiliser
    this.dspaceService.getMappedCollection(itemId).subscribe({
      next: (names) => {
        if (names && names[itemId]) {
          this.collectionNames[itemId] = names[itemId];
        }
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
    // Si l'élément est déjà ouvert, on le ferme
    if (this.expandedRows[id]) {
      this.expandedRows[id] = false;
    } else {
      // Réinitialiser tous les éléments (fermer tous les détails)
      this.expandedRows = {};

      // Ouvrir uniquement l'élément sélectionné
      this.expandedRows[id] = true;
    }
  }
}
