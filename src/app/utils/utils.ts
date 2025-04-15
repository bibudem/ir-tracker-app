export class Utils  {
/**
 * Nettoie et traduit les données de provenance.
 * Cette méthode remplace certains mots par des balises HTML correspondantes,
 * et supprime tout ce qui suit "checksum:" et "No. of bitstreams:" et inclut ces chaînes de caractères.
 *
 * @param provenanceArray - Un tableau d'objets contenant les données de provenance.
 * @returns Un tableau d'objets avec les valeurs nettoyées et traduites.
 */
  cleanAndTranslateData(provenanceArray: any[]): string[] {
    if (!Array.isArray(provenanceArray)) {
      console.warn('provenanceArray n\'est pas un tableau:', provenanceArray);
      return [];
    }

    const translations: { [key: string]: string } = {
      '\\bon\\b': '<span>le</span>',
      '\\bStep: reviewstep - action:reviewaction\\b': '',
      '\\bStep: editstep - action:editaction\\b': '',
      '\\bStep: finaleditstep - action:finaleditaction\\b': '',
      '\\bItem was in collections\\b': '<span>Cet élément était dans les collections </span>',
      '\\breason\\b': '<strong>pour la raison suivante </strong>',
      'Submitted by': '<strong>Soumis par: </strong>',
      'Approved for entry into archive by': '<strong>Approuvé par: </strong>',
      'Rejected by': '<strong class="text-danger">Rejeté par: </strong>',
      'Item withdrawn by': '<strong class="text-danger">Élément retiré par: </strong>',
      'Item reinstated by': '<strong class="text-warning">Élément réintégré par: </strong>',
      'Made available in DSpace': '<strong class="text-success">Publié sur Papyrus: </strong>',
    };

    return provenanceArray.map((item) => {
      let value = item.value;

      // Remplacer les mots par les balises HTML correspondantes
      Object.keys(translations).forEach((key) => {
        const regex = new RegExp(key, 'g');
        value = value.replace(regex, translations[key]);
      });

      // Suppression de tout ce qui suit "No. of bitstreams:" et inclut "No. of bitstreams:"
      value = value.replace(/No\. of bitstreams:.*/, '').trim();

      // Supprimer tout ce qui suit "checksum:" et inclut "checksum:"
      value = value.replace(/checksum:.*/, '').trim();


      value = value.replace(/workflow start=.*/, '').trim();

      value = value.replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}Z)?.*/, (match, datePart) => {
        // Conserver la date originale (format UTC ou d'origine)
        return datePart;
      });

      // Supprimer le nom du fichier (avec extensions .pdf, .zip, .mov) et tout ce qui suit
      value = value.replace(/[\w-]+\.(pdf|zip|mov|txt|xlsx|docx)\b.*/gi, '').trim();

      return value;
    });
  }

  /**
   * Nettoie une requête en supprimant les espaces inutiles.
   * @param query - La chaîne de caractères représentant la requête.
   * @returns La requête nettoyée.
   */
  nettoyerQueryEspace(query: string): string {
    return query ? query.replace(/\s+/g, ' ').trim() : '';
  }

  /**
   * Cette méthode copie le texte donné dans le presse-papiers et change temporairement la couleur du bouton pour indiquer que l'action a réussi.
   * Après 2 secondes, la couleur du bouton revient à son état d'origine.
   *
   * @param text Le texte à copier dans le presse-papiers.
   * @param textCopied La variable qui sera mise à jour avec le texte copié, utilisée pour changer la couleur du bouton.
   */
  copyToClipboard(text: string, textCopied:string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        textCopied = text; // Changer la couleur du bouton
      }).catch(err => {
        console.error('Erreur lors de la copie dans le presse-papiers :', err);
        alert('Impossible de copier dans le presse-papiers');
      });
    } else {
      console.warn('API Clipboard non disponible');
    }
  }


  /**
   * Normalise une chaîne de caractères : supprime les accents, met en minuscule,
   * enlève les caractères non alphanumériques.
   */
  normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }


}
