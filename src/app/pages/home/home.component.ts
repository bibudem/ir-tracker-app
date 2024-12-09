import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DSpaceService } from "../../services/dspace.service";
import { TranslateService } from "@ngx-translate/core";
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('chart') chartElement!: ElementRef;

  options = {
    series: [1200, 645, 335],
    chart: {
      width: 340,
      type: 'donut',
    },
    labels: ["Thèse et Mémoire ", "Travaux et publications", "Productions étudiantes"],
    colors: ["#3361ff",  "#12bf24", "#ff6632"],
    legend: {
      show: false,
      position: 'top',
      horizontalAlign: 'left',
      offsetX: -20
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          height: 260
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  constructor(private dspaceService: DSpaceService, public translate: TranslateService) { }

  ngOnInit(): void {
    // Code d'initialisation si nécessaire
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  private renderChart(): void {
    const chart = new ApexCharts(this.chartElement.nativeElement, this.options);
    chart.render();
  }
}
