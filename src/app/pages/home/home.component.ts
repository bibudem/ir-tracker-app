import { Component, OnInit } from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // Données dynamiques pour les statistiques
  statistics = {
    users: '...',
    collections: '...',
    items: '...',
    communities: '...',
  };

  /**
   * Constructeur du composant Home.
   * @param dspaceService Service pour interagir avec l'API DSpace.
   * @param translate Service pour la traduction multilingue.
   */
  constructor(private dspaceService: DSpaceService, public translate: TranslateService) { }

  /**
   * Lifecycle hook Angular exécuté après l'initialisation du composant.
   * Charge les statistiques initiales.
   */
  ngOnInit(): void {
    this.loadStatistics();
  }

  /**
   * Charge les statistiques via le service DSpace et met à jour les données dynamiques.
   * En cas d'erreur, un message est affiché dans la console.
   */
  private loadStatistics(): void {
    this.dspaceService.getStatistics().subscribe({
      next: (data) => {
        // Mise à jour des statistiques avec les données récupérées
        this.statistics = {
          users: data.users || 0,
          collections: data.collections || 0,
          items: data.items || 0,
          communities: data.communities || 0,
        };
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }
}
