import { Component, OnInit } from '@angular/core';
import { SidebarService } from '../sidebar/sidebar.service';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  public translate: TranslateService;

  constructor(public sidebarservice: SidebarService, translate: TranslateService) {
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
  }

  // Method to change the language
  changeLanguage(lang: string) {
    this.translate.use(lang);
  }
}
