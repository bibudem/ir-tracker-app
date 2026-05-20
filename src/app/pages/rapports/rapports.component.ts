import { Component, OnInit, OnDestroy } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
  sortField = 'lastModified';
  sortOrder = 'desc';
  searchDetailsQuery = '';

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

  readonly searchChange$ = new Subject<void>();

  private subscriptions: Subscription[] = [];

  methodesUtils: Utils = new Utils();

  constructor(private dspaceService: DSpaceService) {}

  ngOnInit(): void {
    this.listCollections();
    this.subscriptions.push(
      this.searchChange$.pipe(debounceTime(300)).subscribe(() => this.applyFilters())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadItems(): void {
    this.items = [];
    const params = {
      collection: this.filters.collection || '',
      type: this.filters.type || '',
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };
    this.loading = true;
    const sub = this.dspaceService.getFilteredItems(params).subscribe(
      (data: any) => {
        this.items = data.items.map(item => ({
          ...item,
          style: this.getItemStyle(item.lastModified),
          timeElapsed: new Date(item.lastModified).toLocaleDateString(),
          cleanedProvenance: item.metadata.provenance
            ? this.methodesUtils.cleanAndTranslateData(item.metadata.provenance)
            : []
        }));
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
    this.filteredItems = [...this.items];
    this.filteredItems.sort((a, b) => {
      const fieldA = a[this.sortField] || '';
      const fieldB = b[this.sortField] || '';

      if (this.sortField === 'lastModified') {
        const dateA = new Date(fieldA).getTime();
        const dateB = new Date(fieldB).getTime();
        return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }

      return this.sortOrder === 'desc' ? fieldB.localeCompare(fieldA) : fieldA.localeCompare(fieldB);
    });
  }

  private getDaysDiff(lastModified: string): number {
    return (new Date().getTime() - new Date(lastModified).getTime()) / (1000 * 60 * 60 * 24);
  }

  getItemStyle(lastModified: string): string {
    const diff = this.getDaysDiff(lastModified);
    if (diff < 30) return 'success';
    if (diff < 60) return 'warning';
    return 'danger';
  }

  getTimeElapsed(lastModified: string): string {
    return new Date(lastModified).toLocaleDateString();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortItems();
  }

  applyFilters(): void {
    this.filteredItems = this.items.filter(item => {
      const authorMatch = this.searchQuery
        ? item.metadata.author?.some(author => {
            const authorValue = author.value.toLowerCase();
            const query = this.searchQuery.toLowerCase();
            const queryTokens = query.split(/[\s,]+/).filter(t => t.length > 0);
            const authorTokens = authorValue.split(/[\s,]+/).filter(t => t.length > 0);

            // Règle 1 : tous les mots de la recherche sont présents dans le nom d'auteur
            const querySubsetOfAuthor = queryTokens.every(qt => authorValue.includes(qt));
            // Règle 2 : tous les mots du nom d'auteur sont dans la recherche
            // (gère le cas où la personne a plusieurs prénoms mais n'utilise qu'un seul)
            const authorSubsetOfQuery = authorTokens.every(at => query.includes(at));

            return querySubsetOfAuthor || authorSubsetOfQuery;
          })
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
    this.filteredItems = this.items.filter(item => {
      const diffDays = this.getDaysDiff(item.lastModified);
      if (range === 'danger') return diffDays > 60;
      if (range === 'warning') return diffDays >= 30 && diffDays <= 60;
      if (range === 'success') return diffDays < 30;
      return true;
    });
  }

  trackByFn(_index: number, item: any): string {
    return item.uuid;
  }
}
