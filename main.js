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
                    // @TODO: support summer/winter
                    let season = ((semesterNum === 1) ? 'Fall' : 'Spring');

                    semesterHeader.textContent = season + ' Semester';

                    /* ***** CLASSES ***** */

                    let classes = semester.classes;
                    let creditTotal = 0;

                    classes.forEach(cls => {
                        let tile = get('.template-tile').content.cloneNode(true);
                        let shorthand = get('.tile-shorthand', tile);
                        let fullname = get('.tile-name', tile);
                        let req = get('.req', tile);
                        let attr = get('.attr', tile);
                        let credits = get('.tile-credits', tile);

                        shorthand.innerHTML = cls.subject + '<br />' + cls.number;
                        fullname.textContent = cls.name;
                        req.textContent = handleReq(cls.requirement);
                        req.classList.add(cls.requirement);
                        attr.textContent = handleReq(cls.attribute);
                        attr.classList.add(cls.attribute);
                        credits.textContent = cls.credits + ' cr.';

                        semesterSection.appendChild(tile);
                        creditTotal += cls.credits;
                    });

                    /* ***** TOTALS ***** */

                    let totalTemplate = get('.template-total').content.cloneNode(true);
                    let total = get('.credit-total', totalTemplate);

                    total.textContent = creditTotal + ' cr.';
                    semesterSection.appendChild(totalTemplate);
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
                    return list;
                }
                // otherwise a single requirement
                else {
                    return expandReq(reqs);
                }
            }

            function expandReq(abbrev) {
                switch (abbrev) {
                    case 'gened':
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
                    default:
                        return capitalizeFirstLetter(abbrev);
                }
            }

            function buildPill(abbrev, fullname) {
                a;
            }

            function capitalizeFirstLetter(string) {
                return string[0].toUpperCase() + string.slice(1);
            }
        }

        function cleanUp() {
            get('.loading').remove();
            get('.requirements').setAttribute('style', '');
            getAll('template').forEach(template => template.remove());
        }
    }

    initPlan();
})(), false);