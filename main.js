document.addEventListener('DOMContentLoaded', (function () {
    'use strict';

    function get(selector, scope = document) {
        return scope.querySelector(selector);
    }

    function getAll(selector, scope = document) {
        return scope.querySelectorAll(selector);
    }

    function initPlan() {
        // @TODO: allow user input via localStorage?

        let request = new XMLHttpRequest();
        let requestURL = 'https://raw.githubusercontent.com/gw859060/four-year-plan/main/courses.json';

        request.open('GET', requestURL);
        request.responseType = 'json';
        request.send();
        request.addEventListener('load', function () {
            buildSections();
            cleanUp();
        });

        function buildSections() {

            /* ***** YEARS ***** */

            let years = request.response.years;

            years.forEach(year => {
                let yearTemplate = get('.template-year').content.cloneNode(true);
                let yearNum = year.year;
                let yearSection = get('.year', yearTemplate);
                let yearHeader = get('.year-num', yearTemplate);

                yearHeader.textContent = 'Year ' + yearNum;
                get('main').appendChild(yearTemplate);

                /* ***** SEMESTERS ***** */

                let semesters = year.semesters;

                semesters.forEach(semester => {
                    let semesterNum = semester.semester;
                    let semesterSection = getAll('.semester', yearSection)[semesterNum - 1];
                    let semesterHeader = get('.semester-num', semesterSection);

                    // @TODO: show status (in progress/completed)
                    semesterHeader.textContent = 'Semester ' + semesterNum;

                    /* ***** CLASSES ***** */

                    let classes = semester.classes;
                    let creditTotal = 0;

                    classes.forEach(cls => {
                        let rowTemplate = get('.template-row').content.cloneNode(true);
                        let classNode = get('.class', rowTemplate);
                        let reqNode = get('.requirement', rowTemplate);
                        let attrNode = get('.attribute', rowTemplate);
                        let creditsNode = get('.credits', rowTemplate);

                        createClassLink(classNode, cls.subject, cls.number);
                        reqNode.textContent = handleReq(cls.requirement);
                        attrNode.textContent = handleReq(cls.attribute);
                        creditsNode.textContent = cls.credits;
                        creditTotal += cls.credits;
                        get('tbody', semesterSection).appendChild(rowTemplate);
                    });

                    /* ***** TOTALS ***** */

                    let totalTemplate = get('.template-total').content.cloneNode(true);
                    let totalNode = get('.credit-total', totalTemplate);

                    totalNode.textContent = creditTotal;
                    get('tbody', semesterSection).appendChild(totalTemplate);
                });
            });

            function createClassLink(node, subject, number) {
                let link = document.createElement('a');

                link.classList.add('class-link');
                link.setAttribute('target', '_blank');
                link.setAttribute('ref', 'noopener');
                link.href = `https://catalog.wcupa.edu/search/?P=${subject}+${number}`;
                link.textContent = subject + ' ' + number;
                node.appendChild(link);
            }

            function handleReq(reqs) {
                // if it fulfills multiple requirements
                if (typeof reqs === 'object') {
                    let list = [];

                    reqs.forEach(req => list.push(expandReq(req)));
                    // list.forEach(item => );

                    return list;
                }
                // otherwise a single requirement
                else {
                    return expandReq(reqs);
                }
            }

            function expandReq(abbrev) {
                switch (abbrev) {
                    case 'gen ed':
                        return 'Gen. Ed.';
                        break;
                    case 'fye':
                        return 'First Year Experience';
                        break;
                    case 'social':
                        return 'Social Science';
                        break;
                    case 'math':
                        return 'Mathematics';
                        break;
                    case 'english':
                        return 'English Composition';
                        break;
                    case 'writing':
                        return 'Writing Emphasis';
                        break;
                    case 'speaking':
                        return 'Speaking Emphasis';
                        break;
                    case 'i':
                        return 'Interdisciplinary';
                        break;
                    case 'j':
                        return 'Diverse Communities';
                        break;
                    case 'complex':
                        return 'Complex Large-Scale Systems';
                        break;
                    default:
                        return capitalizeFirstLetter(abbrev);
                }
            }

            function capitalizeFirstLetter(string) {
                return string[0].toUpperCase() + string.slice(1);
            }
        }

        function cleanUp() {
            // get('.loading').remove();
            getAll('template').forEach(template => template.remove());
        }
    }

    initPlan();
})(), false);