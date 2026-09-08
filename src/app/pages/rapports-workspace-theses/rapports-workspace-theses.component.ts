import { Component, OnInit, OnDestroy } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Utils } from '../../utils/utils';

/**
 * Rapport "TME en attente" (ajouté le 2026-09-08).
 * Thèses/mémoires laissés dans le workspace des étudiants (jamais soumis au
 * workflow), inactifs depuis 30 jours ou plus et dont le dc.date.issued est
 * postérieur ou égal à 2025.
 */
// Les collections de dépôt des thèses et mémoires se terminent par
// "- Thèses et mémoires" (ex. "Faculté de médecine – Thèses et mémoires").
// Sert à ne proposer par défaut, dans le filtre, que les collections
// pertinentes pour ce rapport plutôt que la liste complète des collections
// de Papyrus. Le tiret peut être un tiret simple "-" ou une incise "–".
const THESES_COLLECTION_SUFFIX = /[-–]\s*thèses et mémoires\s*$/i;

@Component({
  selector: 'app-rapports-workspace-theses',
  templateUrl: './rapports-workspace-theses.component.html',
  styleUrls: ['./rapports-workspace-theses.component.scss'],
})
export class RapportsWorkspaceThesesComponent implements OnInit, OnDestroy {
  readonly minDays = 30;
  readonly minYear = 2025;

  items: any[] = [];
  allCollections: any[] = [];
  collections: any[] = [];
  filteredItems: any[] = [];
  searchQuery = '';
  loading = false;
  loadingCollection = true;
  // filters.collection est un tableau d'ids de collections ; un tableau vide
  // signifie "toutes les collections" (aucun filtre appliqué au rapport).
  filters: any = { collection: [] };
  collectionSearchQuery = '';
  sortField = 'lastModified';
  sortOrder = 'desc';
  searchDetailsQuery = '';

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
      collection: (this.filters.collection || []).join(','),
      minDays: this.minDays,
      minYear: this.minYear,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };
    this.loading = true;
    const sub = this.dspaceService.getWorkspaceThesesReport(params).subscribe(
      (data: any) => {
        this.items = data.items.map(item => ({
          ...item,
          style: this.getItemStyle(item.lastModified),
          timeElapsed: new Date(item.lastModified).toLocaleDateString(),
          dateIssued: item.metadata['date.issued']?.[0]?.value || '',
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
        this.allCollections = data;
        this.updateCollectionsList();
        this.loadingCollection = false;
      },
      (err: any) => {
        console.error('Erreur de chargement des collections :', err);
      }
    );
    this.subscriptions.push(sub);
  }

  /**
   * Ne propose que les collections de dépôt des thèses et mémoires (celles
   * dont le nom se termine par "Thèses et mémoires") afin d'éviter de faire
   * chercher l'utilisateur dans la liste complète des collections de Papyrus.
   */
  updateCollectionsList(): void {
    this.collections = this.allCollections.filter(c => THESES_COLLECTION_SUFFIX.test(c.name || ''));

    // Retire de la sélection courante les collections qui ne sont plus proposées.
    const validIds = new Set(this.collections.map(c => c.id));
    this.filters.collection = (this.filters.collection || []).filter((v: string) => validIds.has(v));
  }

  filteredCollectionOptions(): any[] {
    const query = this.collectionSearchQuery.trim().toLowerCase();
    if (!query) return this.collections;
    return this.collections.filter(c => c.name?.toLowerCase().includes(query));
  }

  selectedCollectionObjects(): any[] {
    const selected: string[] = this.filters.collection || [];
    return this.collections.filter(c => selected.includes(c.id));
  }

  isCollectionSelected(id: string): boolean {
    return (this.filters.collection || []).includes(id);
  }

  toggleCollection(id: string): void {
    const current: string[] = this.filters.collection || [];
    this.filters.collection = current.includes(id)
      ? current.filter(v => v !== id)
      : [...current, id];
  }

  clearCollectionSelection(): void {
    this.filters.collection = [];
  }

  sortItems(): void {
    this.filteredItems = [...this.filteredItems];
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
    return diff < 60 ? 'warning' : 'danger';
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

            const querySubsetOfAuthor = queryTokens.every(qt => authorValue.includes(qt));
            const authorSubsetOfQuery = authorTokens.every(at => query.includes(at));

            return querySubsetOfAuthor || authorSubsetOfQuery;
          })
        : true;

      // Recherche sur tous les champs affichés dans la colonne "Détails de la soumission"
      // (ID, titre, collection, type, date de publication).
      const detailsMatch = this.searchDetailsQuery
        ? [item.uuid, item.name, item.collection, item.type, item.dateIssued].some(field =>
            (field || '').toLowerCase().includes(this.searchDetailsQuery.toLowerCase())
          )
        : true;

      return authorMatch && detailsMatch;
    });
    this.sortItems();
  }

  filterByDateRange(range: string): void {
    this.filteredItems = this.items.filter(item => {
      const diffDays = this.getDaysDiff(item.lastModified);
      if (range === 'danger') return diffDays >= 60;
      if (range === 'warning') return diffDays >= 30 && diffDays < 60;
      return true;
    });
  }

  trackByFn(_index: number, item: any): string {
    return item.uuid;
  }
}
