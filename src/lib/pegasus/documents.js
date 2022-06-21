import { progress } from '../stores';
import { fetchHtml } from './index';

export const MARKS_DOCUMENT = 'Relevé de notes';
export const REPORT_DOCUMENT_PREPA = 'Bulletin de Notes Prépa';
export const REPORT_DOCUMENT = 'Bulletin de notes';
export const YEAR_FILTER = 'PARAM_annee';
export const SEMESTER_FILTER = 'PARAM_produit';

let table;
let documents;

export async function getTable()
{
    if (table) {
        return table;
    }
    
    progress.set("Listage des documents");
    
    const categories = await fetchHtml('extract', 'extract-notes').then(d => d.querySelectorAll('#bloc_0_TITRE'));
    return categories;
}

export async function downloadDocument(doc, filters)
{
    const documents = await getDocuments();
    const blob = await getBlob(window.location.href.includes("inge-etud.epita.net") ? documents.find(d => d.name === doc) : documents.find(d => d.name.includes(filters["PARAM_produit"])), filters);
    
    // TODO: Find a better way
    if (localStorage.download) {
        const d = new Date();
        const f = x => x.toString().padStart(2, '0');
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.target = '_blank';
        link.download = `${doc.split(' ')[0]}_${d.getFullYear()}${f(d.getMonth() + 1)}${f(d.getDate())}_${f(d.getHours())}${f(d.getMinutes())}${f(d.getSeconds())}.pdf`;
        link.click();
    } else {
        open(URL.createObjectURL(blob), '_blank');
    }
}

export async function getDocuments(){
    if (documents) {
        return documents;
    }    


    const result = [];
    
    const categories = await fetchHtml('editions', 'load-editions').then(d => d.querySelectorAll('#content-list-editions'));
    for (const category of categories) {
        const hasFilter = !!category.querySelector('#div-filter');
        const documents = category.querySelectorAll('form');
        
        for (const d of documents) {
            result.push({
                name: d.querySelector('.libelle-edition .texte').innerText.trim(),
                url: d.action,
                method: d.method.toUpperCase(),
                params: Object.fromEntries([...d.querySelectorAll('input')].map(({ name, value }) => [name, value])),
                
                async fetchFilters() {
                    return hasFilter ? getFilters(this) : [];
                },
                async fetchBlob(filters) {
                    return getBlob(this, filters);
                }
            });
        }
    }
    return documents = result;
}

export async function checkDocuments(REPORT_DOCUMENT_PREPA,filters){
    const documents = await getDocuments();
    console.log(documents.find(d => d => d.name.includes(filters["PARAM_produit"])))
    if (documents.find(d => d => d.name.includes(filters["PARAM_produit"])).length != 0){
        return true;
    }
    return false
}

export async function getFilters(document)
{
    progress.set("Listage des filtres");
    
    const filters = [];
    
    const selects = await fetchHtml('editions', 'load-filter', document.params).then(d => d.querySelectorAll('select'));
    for (const select of selects) {
        let parent = select.parentElement;
        if (parent.tagName.toLowerCase() === 'div') {
            parent = parent.parentElement;
        }
        
        // TODO: Constants
        let values = [];
        if (select.id === SEMESTER_FILTER) {
            const year = filters.find(f => f.id === YEAR_FILTER);
            
            for (const { value } of year.values) {
                const subSelect = await fetchHtml('editions', 'get-report-semesters', { annee: value });
                values.push(...getValues(subSelect).map(v => ({ ...v, year: value })));
            }
        } else {
            values = getValues(select);
        }
        
        filters.push({
            id: select.id,
            name: parent.previousElementSibling.querySelector('label').innerText.replace(':', '').trim(),
            values
        });
    }
    
    return filters;
}

function getValues(select)
{
    return [...select.querySelectorAll('option')].map(({ value, innerText }) => ({
        name: innerText.replaceAll(/([( ]) /g, '$1'),
        value
    })).reverse();
}

async function getBlob(document, filters = {})
{
    return fetch(document.url, {
        method: document.method,
        body: new URLSearchParams({ ...document.params, ...filters })
    }).then(r => r.blob());
}
