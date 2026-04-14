import { Component, OnInit } from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent  implements OnInit {

  showAccessDenied: boolean = false;

  /**
   * Constructeur du composant Home.
   * @param dspaceService Service pour interagir avec l'API DSpace.
   * @param translate Service pour la traduction multilingue.
   */
  constructor(private router: Router, private route: ActivatedRoute, private authService: AuthService) { }

  ngOnInit() {
    // Vérifie si l'URL contient le paramètre "non-access"
    this.route.queryParams.subscribe(params => {
      if (params['access']) {
        this.showAccessDenied = true;
      }
    });
  }

  // Appel de la méthode de connexion
  async onLogin() {
    const isAuthenticated = await this.authService.authenticateAndSaveUserData();
    if (isAuthenticated) {
      window.location.href = '/';
    } else {
      console.log('Échec de l\'authentification');
    }
  }
}
