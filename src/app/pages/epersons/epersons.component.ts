import { Component, OnInit } from '@angular/core';
import { DSpaceService } from '../../services/dspace.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import {Utils} from "../../utils/utils";
import {CollectionData} from "../../core/collection.data";

@Component({
  selector: 'app-epersons',
  templateUrl: './epersons.component.html',
  styleUrls: ['./epersons.component.scss'],
})


export class EpersonsComponent implements OnInit {
  query = { email: '', nom: '', prenom: '' };
  result: any[] = [];
  resultItemsWorkflow: any[] = [];
  resultItemsWorkspace: any[] = [];
  resultItems: any[] = [];
  resultItemsCombined: any[] = [];
  selectedItemDetails: any = null;
  collectionNames: { [key: string]: string } = {};
  expandedRows: { [key: string]: boolean } = {};

  showAlert = false;
  alertMessage = '';
  isLoading = false;
  loadingDetails = false;
  actionListeAssocies = true;

  urlDSpace = environment.urlDSpace + 'items/';
  selectedUserId: string | null = null;
  searchQueryString: string = '';

  //importer les fonctions global
  methodesUtils: Utils = new Utils();

  /**
   * Normalise une chaîne en supprimant les accents (é -> e, è -> e, etc)
   */
  private removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  constructor(
    private dspaceService: DSpaceService,
    private collectionData: CollectionData,
    public translate: TranslateService
  ) {}

  ngOnInit(): void {}

  /**
   * Rechercher les utilisateurs en fonction des critères saisis.
   * Crée une requête basée sur les champs remplis et affiche les résultats.
   */
  rechercher(): void {
    this.result = [];
    this.resultItemsCombined = [];
    this.query.email = this.methodesUtils.nettoyerQueryEspace(this.query.email);
    this.query.nom = this.methodesUtils.nettoyerQueryEspace(this.query.nom);
    this.query.prenom = this.methodesUtils.nettoyerQueryEspace(this.query.prenom);

    // CORRECTION: Normaliser les accents avant envoi au backend
    const queryNormalized = {
      email: this.query.email,
      nom: this.removeAccents(this.query.nom),
      prenom: this.removeAccents(this.query.prenom)
    };

    const queryStr = [
      this.query.email,
      this.query.nom,
      this.query.prenom
    ].filter(value => value).join('&');

    this.searchQueryString = queryStr;

    if (!queryStr) return;

    this.isLoading = true;

    this.dspaceService.getPersonnes(queryNormalized).subscribe(
      (data) => {
        this.isLoading = false;
        console.log(data);

        let utilisateurs = data.utilisateurs || [];

        this.showAlert = utilisateurs.length == 0;
        if (utilisateurs.length == 0) {
          this.translate.get('searchNoResults', { query: queryStr }).subscribe((res: string) => {
            this.alertMessage = res;
          });
        } else {
          // Validation pour vérifier prénom et nom - utiliser removeAccents cohérent
          if ((this.query.nom || this.query.prenom)) {
            const nom = this.removeAccents(this.query.nom).toLowerCase().trim();
            const prenom = this.removeAccents(this.query.prenom).toLowerCase().trim();

            // Retourne vrai si searchTerm correspond à namePart, en tenant compte
            // du cas où une personne a plusieurs prénoms mais n'en utilise qu'un.
            const partMatch = (searchTerm: string, namePart: string): boolean => {
              if (!searchTerm) return true;
              const tokens = searchTerm.split(/\s+/).filter(t => t.length > 1);
              return namePart.includes(searchTerm)       // le champ contient la recherche exacte
                || searchTerm.includes(namePart)         // la recherche contient le champ (ex: "Giovanna Florence Dias" contient "Giovanna")
                || tokens.some(t => namePart.includes(t)); // au moins un token de la recherche est présent
            };

            const scoreUser = (user: any): number => {
              const fn = this.removeAccents(user.fullName).toLowerCase();
              const [p1, p2] = fn.split(',').map((p: string) => p.trim());
              let s = 0;
              // Correspondance nom (userPart2 = nom de famille dans notre format)
              if (nom) {
                if (p2 === nom)              s += 10;
                else if (p2.startsWith(nom)) s += 7;
                else if (p2.includes(nom))   s += 5;
                if (p1.includes(nom))        s += 2; // ordre inverse
              }
              // Correspondance prénom (userPart1 = prénom)
              if (prenom) {
                if (p1 === prenom)                s += 10;
                else if (p1.startsWith(prenom))   s += 7;
                else if (p1.includes(prenom))     s += 5;
                else if (prenom.startsWith(p1))   s += 4; // ex: "Giovanna" ⊂ "Giovanna Florence Dias"
                if (p2.includes(prenom))          s += 2; // ordre inverse
              }
              return s;
            };

            utilisateurs = utilisateurs.filter((user: any) => {
              const fullNameNormalized = this.removeAccents(user.fullName).toLowerCase();
              const [userPart1, userPart2] = fullNameNormalized
                .split(',')
                .map((part) => part.trim());

              const normalMatch = partMatch(prenom, userPart1) && partMatch(nom, userPart2);
              const inverseMatch = partMatch(nom, userPart1) && partMatch(prenom, userPart2);

              return normalMatch || inverseMatch;
            });

            utilisateurs.sort((a: any, b: any) => scoreUser(b) - scoreUser(a));
          }
          this.result = utilisateurs;
          this.showAlert = this.result.length === 0;

          if (this.showAlert) {
            this.translate.get('searchNoResults', { query: queryStr }).subscribe((res: string) => {
              this.alertMessage = res;
            });
          }
        }
      },
      (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la récupération des utilisateurs:', error);
      }
    );
  }
  /**
   * Charger les items associés à un utilisateur spécifique.
   * Met à jour les items affichés en fonction de l'utilisateur sélectionné.
   * @param userId - L'identifiant de l'utilisateur.
   */
  afficherItems(userId: string, fullName:string): void {
    this.selectedUserId = userId;
    this.resultItemsCombined = [];
    this.selectedItemDetails = null;
    this.isLoading = true;
    this.expandedRows = {};

    //console.log('Appel à getUserItems avec:', { userId, fullName });

    this.dspaceService.getUserItems(userId, fullName).subscribe(
      (data) => {
        console.log('Réponse de getUserItems:', data);
        
        if (data.workflowItems.length === 0 && data.userItems.length === 0 && data.workspaceItems.length === 0) {
          //console.log('Aucun élément trouvé pour cet utilisateur');
          this.alertMessage = 'Aucun élément n\'est associé à ce compte.';
          this.showAlert = true;
          this.isLoading = false;
        } else {
          console.log('Éléments trouvés:', {
            workflow: data.workflowItems.length,
            workspace: data.workspaceItems.length,
            userItems: data.userItems.length
          });
          
          this.showAlert = false;
          this.alertMessage = '';
          this.resultItemsWorkflow = data.workflowItems || [];
          this.resultItemsWorkspace = data.workspaceItems || [];
          this.resultItems = data.userItems || [];

          // Combine les deux listes d'items
          this.resultItemsCombined = [
            ...this.resultItemsWorkflow,
            ...this.resultItemsWorkspace,
            ...this.resultItems,
          ];
          
          //console.log('Items combinés:', this.resultItemsCombined);
          this.isLoading = false;
          // Déclencher le défilement une fois les données chargées
          this.scrollToUserSubmissions(userId);
        }
      },
      (error) => {
        console.error('Erreur lors de la récupération des items:', error);
        this.isLoading = false;
      }
    );
  }

  /**
   * Afficher les détails d'un item spécifique.
   * Met à jour l'affichage avec les détails de l'item sélectionné.
   * @param itemId - L'identifiant de l'item.
   */
  afficherDetailsItem(itemId: string): void {
    // Protection contre l'appel multiple pour le même item
    if (this.loadingDetails || this.selectedItemDetails?.id === itemId) {
      return;
    }

    this.selectedItemDetails = null;
    this.loadingDetails = true;

    this.dspaceService.getItemDetails(itemId).subscribe(
      (data) => {
        this.selectedItemDetails = data;
        //console.log(data);
        this.loadingDetails = false;
      },
      (error) => {
        this.loadingDetails = false;
        console.error('Erreur lors de la récupération des détails de l’item:', error);
      }
    );
  }

  getNameCollection(itemId: string, collectionId: string): void {
    this.collectionData.getNameCollection(itemId, collectionId).subscribe(
      (collectionName) => {
        this.collectionNames[itemId] = collectionName; // Met à jour le nom de la collection pour l'item donné
      },
      (error) => {
        console.error('Erreur lors de la récupération du nom de la collection:', error);
      }
    );
  }

  /**
   * Réinitialiser le formulaire de recherche et effacer les résultats.
   */
  resetForm(): void {
    this.query = { email: '', nom: '', prenom: '' };
    this.result = [];
    this.resultItems = [];
    this.selectedItemDetails = null;
    this.resultItemsCombined = [];
    this.showAlert = false;
    this.isLoading = false;
  }


  /**
   * Basculer l'affichage des détails pour une ligne spécifique.
   * @param id - L'identifiant de l'item ou de l'utilisateur.
   */
  toggleRow(id: string, idCollection: string): void {
    if (this.expandedRows[id]) {
      this.expandedRows = {};
      this.selectedItemDetails = null;
    } else {
      this.expandedRows = { [id]: true };
      if (!this.selectedItemDetails || this.selectedItemDetails.id !== id) {
        this.afficherDetailsItem(id);
        this.getNameCollection(id, idCollection);
      }
    }
  }

// Modifiez la fonction scrollToUserSubmissions
scrollToUserSubmissions(userId: string) {
  // Attendre que le DOM soit mis à jour avec les nouvelles données
  setTimeout(() => {
    const element = document.getElementById(`user-submissions-${userId}`);
    if (element) {
      // Calculer la position de l'élément
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100; // 100px d'offset pour l'en-tête
      
      // Faire défiler vers la position
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      // Ajouter un effet visuel
      element.classList.add('highlight-section');
      setTimeout(() => {
        element.classList.remove('highlight-section');
      }, 1500);
    }
  }, 300); // Augmenter le délai pour s'assurer que le DOM est mis à jour
}
}
