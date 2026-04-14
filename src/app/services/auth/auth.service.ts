import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private encryptionKey = 'vWRf4hge2LjUM6ji8Nu4$eF1xYz';
  private user: any = {};
  isLoggedIn: boolean = false;
  redirectUrl: string | undefined = '';

  constructor(private http: HttpClient) {}

  /**
   * Vérifie si l'utilisateur est authentifié.
   */
  isAuthenticated(): Observable<boolean> {
    return this.http.get<any>('/api/auth/status').pipe(
      map((response) => {
        if (response.authenticated) {
          this.user = response.user;
          //console.log(this.user);

          // Vérification si l'utilisateur fait partie du groupe 'bib-aut-papyrus-tme-admin' et 'esp-TGDE-M2'
          if (this.user.groups && (this.user.groups.includes('bib-aut-papyrus-tme-admin') || this.user.groups.includes('esp-TGDE-M2'))) {
            this.setUserInfoInLocalStorage(this.user.name);
            this.isLoggedIn = true;
            return true;
          } else {
            // Rediriger vers /login?non-access si l'utilisateur ne fait pas partie du groupe
            window.location.href = '/login?access=0';
            this.isLoggedIn = false;
            return false;
          }
        } else {
          this.isLoggedIn = false;
          return false;
        }
      }),
      catchError((error) => {
        console.error('Erreur lors de la vérification de l\'authentification', error);
        this.isLoggedIn = false;
        return of(false);
      })
    );
  }

  /**
   * Applique une opération XOR entre chaque caractère de la donnée et la clé de chiffrement.
   */
  private xorEncryptDecrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  /**
   * Chiffre les données avec XOR et les encode en Base64.
   */
  private encryptData(data: any): string {
    const jsonString = JSON.stringify(data);
    const encryptedData = this.xorEncryptDecrypt(jsonString, this.encryptionKey);
    return btoa(encryptedData);
  }

  /**
   * Déchiffre les données en Base64 et applique XOR pour retrouver les données originales.
   */
  private decryptData(encryptedData: string): any {
    const decodedData = atob(encryptedData);
    const decryptedData = this.xorEncryptDecrypt(decodedData, this.encryptionKey);
    return JSON.parse(decryptedData);
  }

  /**
   * Enregistre les informations de l'utilisateur dans localStorage avec chiffrement.
   */
  setUserInfoInLocalStorage(userData: any): void {
    const encryptedData = this.encryptData(userData);
    localStorage.setItem('user_info', encryptedData);
  }

  /**
   * Récupère les informations de l'utilisateur depuis localStorage et les déchiffre.
   */
  getUserInfoFromLocalStorage(): any | null {
    const encryptedData = localStorage.getItem('user_info');
    return encryptedData ? this.decryptData(encryptedData) : null;
  }

  /**
   * Authentifie l'utilisateur et sauvegarde ses informations.
   */
  async authenticateAndSaveUserData(): Promise<boolean> {
    let isLoggedIn = false;
    try {
      const response = await this.http.get<any>('/api/auth/status').pipe(
        take(1),
        catchError((error) => {
          console.error('Erreur lors de l\'authentification', error);
          return of(null);
        })
      ).toPromise();

      if (response && response.authenticated) {
        this.user = response.user;
        this.setUserInfoInLocalStorage(this.user.name);
        this.isLoggedIn = true;
        isLoggedIn = true;
      } else {
        isLoggedIn = false;
        window.location.href = '/api/login';
      }
    } catch (e) {
      console.error('Erreur lors de l\'authentification', e);
      this.logout();
      isLoggedIn = false;
    }
    return isLoggedIn;
  }

  /**
   * Méthode de déconnexion de l'utilisateur.
   */
  logout(): void {
    localStorage.removeItem('user_info');
    this.isLoggedIn = false;
    window.location.href = '/api/logout';
  }
}
