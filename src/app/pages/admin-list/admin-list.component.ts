import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { Subscription } from 'rxjs';
import {environment} from "../../../environments/environment";
import {Utils} from "../../utils/utils";

@Component({
  selector: 'app-admin-list',
  templateUrl: './admin-list.component.html',
  styleUrls: ['./admin-list.component.scss']
})
export class AdminListComponent implements OnInit, OnDestroy {
  collections: any[] = [];
  filteredCollections: any[] = [];
  collectionAdmins: { [key: string]: { reviewer: any[], editor: any[], finaleditor: any[] } } = {};
  isLoading = false;
  errorMessage = '';
  dataSubscription: Subscription;
  adminSubscriptions: Subscription[] = [];

  // Pagination
  page = 1;
  pageSize = 10;

  // Filtres
  searchQuery = '';
  selectedRole = 'all';

  urlDSpace = environment.urlDSpace + '/collections/';
  utils: Utils = new Utils();

  // Variable pour gérer le bouton copié
  adminCopied: string | null = null;

  constructor(private dspaceService: DSpaceService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchCollections();
  }

  /**
   * Récupère la liste des collections depuis le service et charge leurs administrateurs.
   */
  fetchCollections(): void {
    this.isLoading = true;
    this.dataSubscription = this.dspaceService.getCollections().subscribe(
      (data) => {
        this.collections = data || [];
        this.loadAdminsForCollections();
      },
      (error) => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors du chargement des collections';
        console.error(error);
      }
    );
  }

  /**
   * Charge les administrateurs pour chaque collection et met à jour les données.
   */
  loadAdminsForCollections(): void {
    let requestsCompleted = 0;
    this.collections.forEach((collection) => {
      const sub = this.dspaceService.getCollectionAdmins(collection.id).subscribe(
        (adminsByRole) => {
          this.collectionAdmins[collection.id] = {
            reviewer: adminsByRole.reviewer || [],
            editor: adminsByRole.editor || [],
            finaleditor: adminsByRole.finaleditor || []
          };
          requestsCompleted++;
          if (requestsCompleted === this.collections.length) {
            this.filterCollections();
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        },
        (error) => {
          console.error(`Erreur lors du chargement des admins pour ${collection.id}:`, error);
          this.collectionAdmins[collection.id] = { reviewer: [], editor: [], finaleditor: [] };
          requestsCompleted++;
          if (requestsCompleted === this.collections.length) {
            this.filterCollections();
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }
      );
      this.adminSubscriptions.push(sub);
    });
  }

  /**
   * Filtre les collections en fonction de la recherche et du rôle sélectionné.
   */
  filterCollections(): void {
    this.filteredCollections = this.collections.filter(collection => {
      const nameMatches = collection.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const roleMatches = this.selectedRole === 'all' || (this.collectionAdmins[collection.id] && this.collectionAdmins[collection.id][this.selectedRole]?.length > 0);
      return nameMatches && roleMatches;
    });
  }

  /**
   * Calcule le nombre total de pages en fonction du nombre d'éléments filtrés et de la taille de page.
   */
  get totalPages(): number {
    return Math.ceil(this.filteredCollections.length / this.pageSize);
  }

  /**
   * Désinscrit les abonnements aux données pour éviter les fuites de mémoire.
   */
  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    this.adminSubscriptions.forEach(sub => sub.unsubscribe());
  }
}
