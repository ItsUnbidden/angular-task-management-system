import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from "@angular/material/card";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-forbidden',
  imports: [MatCardModule, MatButtonModule, RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css',
})
export class Forbidden {

}
