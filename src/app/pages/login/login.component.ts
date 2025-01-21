import { Component, OnInit } from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";
import { Router, ActivatedRoute } from "@angular/router";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {


  /**
   * Constructeur du composant Home.
   * @param dspaceService Service pour interagir avec l'API DSpace.
   * @param translate Service pour la traduction multilingue.
   */
  constructor(private router: Router, private route: ActivatedRoute) { }

  /**
   * Lifecycle hook Angular exécuté après l'initialisation du composant.
   * Charge les statistiques initiales.
   */
  ngOnInit(): void {
  }

  // On Signup link click
  onSignup() {
    this.router.navigate(['sign-up'], { relativeTo: this.route.parent });
  }
}
