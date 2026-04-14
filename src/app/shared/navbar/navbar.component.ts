import { Component, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { TranslateService } from "@ngx-translate/core";
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  public translate: TranslateService;

  name = '';

  constructor(public sidebarservice: SidebarService, translate: TranslateService, private authService: AuthService, private router: Router) {
    this.translate = translate;
  }

  toggleSidebar() {
    this.sidebarservice.setSidebarState(!this.sidebarservice.getSidebarState());
  }

  getSideBarState() {
    return this.sidebarservice.getSidebarState();
  }

  hideSidebar() {
    this.sidebarservice.setSidebarState(true);
  }

  ngOnInit() {
    /* Search Bar */
    $(document).ready(function () {
      $(".search-toggle-icon").on("click", function() {
        $(".top-header .navbar form").addClass("full-searchbar");
      });
      $(".search-close-icon").on("click", function() {
        $(".top-header .navbar form").removeClass("full-searchbar");
      });
    });

    this.authService.isAuthenticated().subscribe(async isAuthenticated => {
      if (isAuthenticated) {
        try {
          const userInfo = await this.authService.getUserInfoFromLocalStorage();
          if (userInfo) {
            //console.log(userInfo);
            this.name = userInfo;
          }
          // Rediriger si nécessaire
          const redirectUrl = this.authService.redirectUrl || '/';
          this.router.navigate([redirectUrl]);
        } catch (error) {
          console.error('Erreur lors de la récupération des informations utilisateur', error);
        }
      }
    });
  }

  // Method to change the language
  changeLanguage(lang: string) {
    this.translate.use(lang);
  }

  // Méthode de déconnexion
  logout(): void {
    this.authService.logout();
  }
}
