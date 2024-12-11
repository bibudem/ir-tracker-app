import { Component, OnInit } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
})
export class RapportsComponent implements OnInit {
  items: any[] = [];
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  searchQuery = '';
  loading = false;
  selectedItem: any;

  constructor(private dspaceService: DSpaceService) {}

  /**
   * Méthode appelée lors de l'initialisation du composant.
   * Elle charge les données initiales.
   */
  ngOnInit(): void {
    this.loadItems();
  }

  /**
   * Charge les éléments pour la page courante et la taille de page spécifiée.
   * Met à jour la liste des éléments et le nombre total d'éléments.
   */
  loadItems(): void {
    this.loading = true;
    this.dspaceService.getWorkflowItems(this.currentPage, this.pageSize).subscribe(
      (response) => {
        this.items = response.items || [];
        this.totalItems = response.totalItems || 0;
        this.loading = false;
      },
      (error) => {
        console.error('Erreur de chargement :', error);
        this.loading = false;
      }
    );
  }

  /**
   * Effectue une recherche et recharge les éléments à partir de la première page.
   */
  onSearch(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  /**
   * Change de page et recharge les éléments pour la page sélectionnée.
   * @param page - Le numéro de la page sélectionnée.
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadItems();
  }

  /**
   * Retourne le style (classe CSS) basé sur la date de dernière modification.
   * @param lastModified - La date de la dernière modification.
   * @returns Une chaîne de classe CSS : 'info' ou 'danger'.
   */
  getItemStyle(lastModified: string): string {
    const diffInMonths =
      (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return diffInMonths <= 2 ? 'info' : 'danger';
  }

  /**
   * Calcule le nombre total de pages disponibles.
   * @returns Un tableau des numéros de pages.
   */
  getTotalPages(): number[] {
    if (!this.totalItems || !this.pageSize) {
      return []; // Retourne un tableau vide si les valeurs sont indéfinies
    }
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    return Array.from({ length: totalPages }, (_, i) => i + 1); // Crée un tableau [1, 2, ..., totalPages]
  }

  /**
   * Calcule la durée écoulée sous forme "X jours" ou "Y mois Z jours".
   * @param lastModified - La date de la dernière modification.
   * @returns Une chaîne formatée indiquant la durée écoulée.
   */
  getTimeElapsed(lastModified: string): string {
    if (!lastModified) return 'Date inconnue';
    const lastModifiedDate = new Date(lastModified);
    const today = new Date();
    const diffInTime = today.getTime() - lastModifiedDate.getTime();

    const days = Math.floor(diffInTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;

    if (months > 0) {
      return `${months} mois${remainingDays > 0 ? ` ${remainingDays} jours` : ''}`;
    }
    return `${days} jours`;
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
   * Définit l'élément sélectionné pour l'afficher dans le modal.
   * @param item - L'élément sélectionné.
   */
  selectItem(item: any): void {
    this.selectedItem = item;
  }
}
