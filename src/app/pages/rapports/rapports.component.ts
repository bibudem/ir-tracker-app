import { Component, OnInit, OnDestroy } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subscription } from 'rxjs';

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
  loading = true;
  loadingCollection = true;
  expandedRows: { [key: string]: boolean } = {};
  filters: any = { type: '', collection: '' };
  sortField = 'lastModified';
  sortOrder = 'desc';

  filterOptions: any = {
    types: [
      'Thèse ou mémoire / Thesis or Dissertation',
      'Article',
      'Rapport / Report',
      'Livre / Book',
      'Autre / Other',
    ],
  };

  private subscriptions: Subscription[] = [];

  constructor(private dspaceService: DSpaceService) {}

  ngOnInit(): void {
    this.listCollections();
    this.loading = false;
  }

  ngOnDestroy(): void {
    // Désabonnement propre lors de la destruction du composant
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadItems(): void {
    const params = {
      collection: this.filters.collection || '',
      type: this.filters.type || '',
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    };

    const sub = this.dspaceService.getFilteredItems(params).subscribe(
      (data: any) => {
        this.items = data.items.map(item => ({
          ...item
        }));
        //console.log(this.items);
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


  applyFilters(): void {
    this.loading = true;
    this.filteredItems = this.items
      .filter(item => !this.filters.type || item.metadata.type?.includes(this.filters.type))
      .sort((a, b) => {
        const fieldA = a[this.sortField] || '';
        const fieldB = b[this.sortField] || '';
        return this.sortOrder === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
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

  toggleRow(id: string): void {
    this.expandedRows[id] = !this.expandedRows[id];
  }

  /**
   * Nettoie et traduit les données de provenance.
   * Cette méthode remplace certains mots par des balises HTML correspondantes,
   * et supprime tout ce qui suit "checksum:" et "No. of bitstreams:" et inclut ces chaînes de caractères.
   *
   * @param provenanceArray - Un tableau d'objets contenant les données de provenance.
   * @returns Un tableau d'objets avec les valeurs nettoyées et traduites.
   */
  cleanAndTranslateData(provenanceArray: any[]): string[] {
    if (!Array.isArray(provenanceArray)) {
      console.warn('provenanceArray n\'est pas un tableau:', provenanceArray);
      return [];
    }

    const translations: { [key: string]: string } = {
      '\\bon\\b': '<span>le</span>',
      '\\bStep: reviewstep - action:reviewaction\\b': '',
      '\\bStep: editstep - action:editaction\\b': '',
      '\\bStep: finaleditstep - action:finaleditaction\\b': '',
      '\\bItem was in collections\\b': '<span>Cet élément était dans les collections </span>',
      '\\breason\\b': '<strong>pour la raison suivante </strong>',
      'Submitted by': '<strong>Soumis par: </strong>',
      'Approved for entry into archive by': '<strong>Approuvé par: </strong>',
      'Rejected by': '<strong class="text-danger">Rejeté par: </strong>',
      'Item withdrawn by': '<strong class="text-danger">Élément retiré par: </strong>',
      'Item reinstated by': '<strong class="text-warning">Élément réintégré par: </strong>',
      'Made available in DSpace': '<strong class="text-success">Publié sur Papyrus: </strong>',
    };

    return provenanceArray.map((item) => {
      let value = item.value;

      // Remplacer les mots par les balises HTML correspondantes
      Object.keys(translations).forEach((key) => {
        const regex = new RegExp(key, 'g');
        value = value.replace(regex, translations[key]);
      });

      // Suppression de tout ce qui suit "No. of bitstreams:" et inclut "No. of bitstreams:"
      value = value.replace(/No\. of bitstreams:.*/, '').trim();

      // Supprimer tout ce qui suit "checksum:" et inclut "checksum:"
      value = value.replace(/checksum:.*/, '').trim();


      value = value.replace(/workflow start=.*/, '').trim();

      value = value.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}Z)?.*/, (match, datePart) => {
        // Conserver la date originale (format UTC ou d'origine)
        return datePart;
      });

      // Supprimer le nom du fichier (avec extensions .pdf, .zip, .mov) et tout ce qui suit
      value = value.replace(/[\w-]+\.(pdf|zip|mov|txt|xlsx|docx)\b.*/gi, '').trim();

      return value;
    });
  }

}
