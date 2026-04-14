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
  rechercher(): void {
    if (!this.indexQuery.trim()) return;

    this.isLoading = true;
    this.resultItems = [];
    this.filteredItemsList = [];
    this.personFilter = '';

    const query = this.utils.normalize(this.indexQuery);

    this.dspaceService.getItemsByIndex(this.indexQuery).subscribe(
      (data) => {
        this.isLoading = false;

        if (data.objects) {
          const allItems = data.objects.map(obj => obj._embedded.indexableObject);

          this.resultItems = allItems.filter(item => {
            const authors = item.metadata['dc.contributor.author']?.map(a => this.utils.normalize(a.value)) || [];
            const advisors = item.metadata['dc.contributor.advisor']?.map(a => this.utils.normalize(a.value)) || [];
            return authors.some(a => a.includes(query)) || advisors.some(b => b.includes(query));
          });

          this.filteredItemsList = this.groupItemsByPerson(this.resultItems, query);
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
    const query = this.utils.normalize(this.personFilter);

    if (query) {
      const filtered = this.resultItems.filter(item => {
        const names = [
          ...(item.metadata['dc.contributor.author']?.map(a => a.value) || []),
          ...(item.metadata['dc.contributor.advisor']?.map(a => a.value) || [])
        ];
        return names.some(name => this.utils.normalize(name).includes(query));
      });

      this.filteredItemsList = this.groupItemsByPerson(filtered, query);
    } else {
      const query = this.utils.normalize(this.indexQuery);
      this.filteredItemsList = this.groupItemsByPerson(this.resultItems,query);
    }
  }


  /**
 * Regroupe les items par personne (auteur/directeur) correspondant à la requête.
 */
  groupItemsByPerson(items: any[], query: string): any[] {
    const groups: { [key: string]: { displayName: string, items: any[] } } = {};

    for (const item of items) {
      const people = [
        ...(item.metadata['dc.contributor.author'] || []),
        ...(item.metadata['dc.contributor.advisor'] || [])
      ];

      for (const person of people) {
        const normName = this.utils.normalize(person.value);
        if (normName.includes(query)) {
          if (!groups[normName]) {
            groups[normName] = {
              displayName: person.value,
              items: []
            };
          }
          groups[normName].items.push(item);
        }
      }
    }

    return Object.values(groups);
  }
}
