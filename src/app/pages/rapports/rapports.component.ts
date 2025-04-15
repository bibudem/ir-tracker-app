import { Component, OnInit, OnDestroy } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subscription } from 'rxjs';
import {Utils} from "../../utils/utils";

@Component({
  selector: 'app-rapports',
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
})
export class RapportsComponent implements OnInit, OnDestroy {
  items: any[] = [];
  collections: any[] = [];
  filteredItems: any[] = [];
  searchQuery = '';
  loading = false;
  loadingCollection = true;
  expandedRows: { [key: string]: boolean } = {};
  filters: any = { type: '', collection: '' };
  sortField = 'lastModified';  // Par défaut, on trie par 'lastModified'
  sortOrder = 'desc';  // Ordre de tri par défaut
  searchDetailsQuery = ''; // Pour filtrer les détails de soumission

  filterOptions: any = {
    types: [
      'Thèse ou mémoire / Thesis or Dissertation',
      'Article',
      'Rapport / Report',
      'Livre / Book',
      'Autre / Other',
      'Travail étudiant / Student work'
    ],
  };

  private subscriptions: Subscription[] = [];

  //importer les fonctions global
  methodesUtils: Utils = new Utils();

  constructor(private dspaceService: DSpaceService) {}

  ngOnInit(): void {
    this.listCollections();
  }

  ngOnDestroy(): void {
    // Désabonnement propre lors de la destruction du composant
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadItems(): void {
    this.items= [];
    const params = {
      collection: this.filters.collection || '',
      type: this.filters.type || '',
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };
    this.loading = true;
    const sub = this.dspaceService.getFilteredItems(params).subscribe(
      (data: any) => {
        //console.log(data.items.length);
        this.items = data.items.map(item => ({
          ...item
        }));
        this.filteredItems = [...this.items]; // Copie les items dans filteredItems
        this.sortItems();
        this.filteredItems = [...this.items];
        this.applyFilters();
        this.loading = false;
      },
      (err: any) => {
        console.error('Erreur de chargement des items :', err);
        this.loading = false;
      }
    );
    this.subscriptions.push(sub);
  }

  listCollections(): void {
    const sub = this.dspaceService.getCollections().subscribe(
      (data: any) => {
        this.collections = data;
        this.loadingCollection = false;
      },
      (err: any) => {
        console.error('Erreur de chargement des collections :', err);
      }
    );
    this.subscriptions.push(sub);
  }

  sortItems(): void {
    this.filteredItems = [...this.items]; // Réinitialisation avant de trier
    this.filteredItems.sort((a, b) => {
      const fieldA = a[this.sortField] || '';
      const fieldB = b[this.sortField] || '';

      // Trier par date (lastModified)
      if (this.sortField === 'lastModified') {
        const dateA = new Date(fieldA).getTime();
        const dateB = new Date(fieldB).getTime();
        return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }

      // Pour d'autres champs (si nécessaire)
      return this.sortOrder === 'desc' ? fieldB.localeCompare(fieldA) : fieldA.localeCompare(fieldB);
    });
  }

  getItemStyle(lastModified: string): string {
    const date = new Date(lastModified);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 30) return 'success';
    if (diff < 180) return 'warning';
    return 'danger';
  }

  getTimeElapsed(lastModified: string): string {
    return new Date(lastModified).toLocaleDateString();
  }

  // Fonction de tri sur la colonne 'lastModified'
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortItems();
  }

  applyFilters(): void {
    this.filteredItems = this.items.filter(item => {
      const authorMatch = this.searchQuery
        ? item.metadata.author?.some(author =>
          author.value.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
        : true;

      const detailsMatch = this.searchDetailsQuery
        ? item.name.toLowerCase().includes(this.searchDetailsQuery.toLowerCase()) ||
        item.collection.toLowerCase().includes(this.searchDetailsQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(this.searchDetailsQuery.toLowerCase())
        : true;

      return authorMatch && detailsMatch;
    });
  }

  filterByDateRange(range: string): void {
    const now = new Date();
    this.filteredItems = this.items.filter(item => {
      const itemDate = new Date(item.lastModified);
      const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);

      if (range === 'danger') {
        return diffDays > 60; // Plus de 2 mois
      } else if (range === 'warning') {
        return diffDays >= 30 && diffDays <= 60; // Entre 30 et 60 jours
      } else if (range === 'success') {
        return diffDays <= 29; // Moins d'un mois
      }
      return true;
    });
  }


}
