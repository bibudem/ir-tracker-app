import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
})
export class RapportsComponent implements OnInit, OnDestroy {
  items: any[] = [];
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  searchQuery = '';
  loading = false;
  loadingDetails = false;
  selectedItem: any;
  sortField = 'lastModified';
  sortOrder = 'asc';
  expandedRows: { [key: string]: boolean } = {};
  filters: any = {
    type: '', // Filtre par défaut
  };
  filterOptions: any = {
    types: [
      'Thèse ou mémoire / Thesis or Dissertation',
      'Article',
      'Rapport / Report',
      'Livre / Book',
      'Autre / Other',
    ]
  };
  private subscription: Subscription;

  constructor(
    private dspaceService: DSpaceService,
    private cdr: ChangeDetectorRef // Injection de ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadItems();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;  // Démarre le chargement
    this.items = []; // Réinitialise les items avant de charger une nouvelle page
    this.totalItems = 0;
    this.totalPages = 0;

    this.subscription = this.dspaceService.getWorkflowItemsStream().subscribe(
      (data: any) => {
        console.log('Nouvelle page reçue :', data);

        const parsedItems = Object.values(data.items); // Récupérer les items de la page actuelle
        this.items = this.items.concat(parsedItems); // Ajouter les items au tableau existant

        if (this.items.length > 0 && this.loading) {
          this.loading = false;  // Désactive le chargement dès que la première page est reçue
          // Mettre à jour les informations de pagination
          this.totalItems = data.page.totalElements;
          this.totalPages = data.page.totalPages;
        }

        console.log('Items après ajout:', this.items);

        // Forcer la détection des changements après l'ajout de nouveaux items
        this.cdr.detectChanges();
      },
      (err: any) => {
        console.error('Erreur de streaming :', err);
        // Réessayer la connexion après un certain délai
        setTimeout(() => {
          this.loadItems();
        }, 5000);
      }
    );
  }

  getItemStyle(lastModified: string): string {
    const diffInMonths =
      (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return diffInMonths <= 2 ? 'info' : 'danger';
  }

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

  selectItem(item: any): void {
    this.selectedItem = item;
  }

  toggleRow(id: string): void {
    if (this.expandedRows[id]) {
      this.expandedRows[id] = false;
    } else {
      this.expandedRows = {};
      this.expandedRows[id] = true;
    }
  }

  trackById(index: number, item: any): string {
    return item.uuid;
  }

  parseInt(value: string): number {
    return parseInt(value, 10);
  }
}
