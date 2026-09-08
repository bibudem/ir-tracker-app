import { Component, OnInit } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { CollectionData } from '../../core/collection.data';
import { Utils } from '../../utils/utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrls: ['./discover.component.scss']
})
export class DiscoverComponent implements OnInit {
  indexQuery: string = '';
  personFilter: string = '';
  resultItems: any[] = [];
  filteredItemsList: any[] = [];
  showAlert = false;
  alertMessage = '';
  isLoading = false;

  urlDSpace = environment.urlDSpace + '/items/';
  utils: Utils = new Utils();

  constructor(
    private dspaceService: DSpaceService,
    private collectionData: CollectionData,
    public translate: TranslateService
  ) {}

  ngOnInit(): void {}

  /**
   * Recherche des items à partir de la chaîne saisie dans `indexQuery`,
   * filtre les résultats selon les auteurs/directeurs correspondant.
   */
  private toTokens(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[\s,]+/)
      .map(t => t.replace(/[^a-z0-9]/g, ''))
      .filter(t => t.length > 1);
  }

  private nameMatchesTokens(name: string, tokens: string[]): boolean {
    const norm = this.utils.normalize(name);
    return tokens.every(token => norm.includes(token));
  }

  rechercher(): void {
    if (!this.indexQuery.trim()) return;

    this.isLoading = true;
    this.resultItems = [];
    this.filteredItemsList = [];
    this.personFilter = '';

    const tokens = this.toTokens(this.indexQuery);

    this.dspaceService.getItemsByIndex(this.indexQuery).subscribe(
      (data) => {
        this.isLoading = false;

        if (data.objects) {
          const allItems = data.objects.map(obj => obj._embedded.indexableObject);

          this.resultItems = allItems.filter(item => {
            const authors = item.metadata['dc.contributor.author']?.map(a => a.value) || [];
            const advisors = item.metadata['dc.contributor.advisor']?.map(a => a.value) || [];
            return [...authors, ...advisors].some(name => this.nameMatchesTokens(name, tokens));
          });

          this.filteredItemsList = this.groupItemsByPerson(this.resultItems, tokens);
        }

        this.showAlert = this.resultItems.length === 0;
      },
      (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la récupération des items:', error);
      }
    );
  }

/**
 * Réinitialise tous les champs et résultats de recherche.
 */
  resetSearch(): void {
    this.resultItems = [];
    this.filteredItemsList = [];
    this.indexQuery = '';
    this.personFilter = '';
    this.showAlert = false;
  }

/**
 * Applique un filtre sur les personnes (auteurs/directeurs) des items trouvés
 * et regroupe les résultats filtrés.
 */
  applyFilters(): void {
    const tokens = this.personFilter.trim()
      ? this.toTokens(this.personFilter)
      : this.toTokens(this.indexQuery);

    const filtered = tokens.length > 0
      ? this.resultItems.filter(item => {
          const names = [
            ...(item.metadata['dc.contributor.author']?.map(a => a.value) || []),
            ...(item.metadata['dc.contributor.advisor']?.map(a => a.value) || [])
          ];
          return names.some(name => this.nameMatchesTokens(name, tokens));
        })
      : this.resultItems;

    this.filteredItemsList = this.groupItemsByPerson(filtered, tokens);
  }

  groupItemsByPerson(items: any[], tokens: string[]): any[] {
    const groups: { [key: string]: { displayName: string, items: any[] } } = {};

    for (const item of items) {
      const people = [
        ...(item.metadata['dc.contributor.author'] || []),
        ...(item.metadata['dc.contributor.advisor'] || [])
      ];

      for (const person of people) {
        if (this.nameMatchesTokens(person.value, tokens)) {
          const normName = this.utils.normalize(person.value);
          if (!groups[normName]) {
            groups[normName] = { displayName: person.value, items: [] };
          }
          groups[normName].items.push(item);
        }
      }
    }

    return Object.values(groups);
  }
}
