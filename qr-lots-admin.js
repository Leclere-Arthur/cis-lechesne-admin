(function () {
    'use strict';
    const section = document.getElementById('admin-qr-lots');
    if (!section) return;
    const statut = document.getElementById('admin-qr-statut');
    const liste = document.getElementById('admin-qr-historique');
    const generer = document.getElementById('admin-qr-generer');
    let busy = false;

    function autorise() {
        const p = currentProfile;
        return p?.actif === true && adminSoftwareAccess(p) &&
            ['acces_administration', 'acces_gestion_materiel'].every(cle => {
                const valeur = p.permissions_personnalisees?.[cle];
                return typeof valeur === 'boolean' ? valeur : roleOf(p)?.[cle] === true;
            });
    }

    async function rpc(nom, args = {}) {
        if (!autorise()) throw Error('Accès réservé à l’administration pharmacie.');
        const compte = currentProfile.id;
        const {data, error} = await sb.rpc(nom, args);
        if (!autorise() || currentProfile.id !== compte) throw Error('La session a changé.');
        if (error) throw Error(error.message);
        return data;
    }

    async function charger() {
        liste.replaceChildren();
        const lots = await rpc('cis_qr_lots_lire');
        if (!lots.length) liste.textContent = 'Aucun lot créé.';
        for (const lot of lots) {
            const ligne = document.createElement('p');
            const bouton = document.createElement('button');
            bouton.type = 'button';
            bouton.className = 'retro';
            bouton.textContent = 'Réimprimer le PDF';
            ligne.append(`${new Date(lot.cree_le).toLocaleString('fr-FR')} · Lot ${lot.lot_id.slice(0, 8)} · ${lot.total} étiquettes · ${lot.vierges} vierges `, bouton);
            bouton.onclick = async () => {
                bouton.disabled = true;
                try {
                    const codes = await rpc('cis_qr_lot_etats', {p_lot: lot.lot_id});
                    CISQRLocalPDF.exporter(codes, lot.lot_id.slice(0, 8));
                } catch (e) {
                    statut.textContent = e.message;
                } finally {
                    bouton.disabled = false;
                }
            };
            liste.append(ligne);
        }
    }

    function actualiserAcces() {
        section.hidden = !autorise();
        section.open = false;
        liste.replaceChildren();
        statut.textContent = '';
    }

    section.addEventListener('toggle', async () => {
        if (!section.open || !autorise()) return;
        try { await charger(); }
        catch (e) { statut.textContent = e.message; }
    });

    generer.onclick = async () => {
        if (busy || !autorise()) return;
        busy = true;
        generer.disabled = true;
        statut.textContent = 'Création du lot…';
        let lot;
        try {
            lot = await rpc('cis_qr_generer_lot', {
                p_quantite: Number(document.getElementById('admin-qr-quantite').value)
            });
            CISQRLocalPDF.exporter(lot.codes, lot.lot_id.slice(0, 8));
            statut.textContent = 'Lot créé. Le PDF reste disponible pour réimpression.';
        } catch (e) {
            statut.textContent = lot ? 'Lot créé. Téléchargement indisponible : ' + e.message : e.message;
        } finally {
            try { if (autorise()) await charger(); }
            catch (e) { statut.textContent += ' ' + e.message; }
            busy = false;
            generer.disabled = false;
        }
    };

    window.CISAdminLotsQR = {actualiserAcces};
    actualiserAcces();
})();
