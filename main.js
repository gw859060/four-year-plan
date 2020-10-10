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
                        let tileTemplate = get('.template-tile').content.cloneNode(true);
                        let shorthandNode = get('.tile-shorthand', tileTemplate);
                        let fullnameNode = get('.tile-name', tileTemplate);
                        let reqContainer = get('.req-container', tileTemplate);
                        let creditsNode = get('.tile-credits', tileTemplate);

                        createCatalogLink(shorthandNode, cls.subject, cls.number);
                        fullnameNode.textContent = cls.name;
                        handleReq(reqContainer, cls.requirement);
                        handleReq(reqContainer, cls.attribute);
                        creditsNode.textContent = cls.credits + ' cr.';
                        creditTotal += cls.credits;

                        semesterSection.appendChild(tileTemplate);
                    });

                    /* ***** TOTALS ***** */

                    let totalTemplate = get('.template-total').content.cloneNode(true);
                    let total = get('.credit-total', totalTemplate);

                    total.textContent = creditTotal + ' cr.';
                    semesterSection.appendChild(totalTemplate);
                });
            });

            function createCatalogLink(node, subject, number) {
                let link = document.createElement('a');

                link.classList.add('shorthand-link');
                link.setAttribute('target', '_blank');
                link.setAttribute('ref', 'noopener');
                link.setAttribute('title', 'Open course catalog on wcupa.edu');
                link.href = `https://catalog.wcupa.edu/search/?P=${subject}+${number}`;
                link.innerHTML = subject + '<br />' + number;
                node.appendChild(link);
            }

            function handleReq(node, abbrev) {
                // if class contains multiple attributes
                if (typeof abbrev === 'object') {
                    abbrev.forEach(attr => buildPill(node, attr));
                } else {
                    buildPill(node, abbrev);
                }

                function buildPill(node, attr) {
                    let pill = document.createElement('span');

                    pill.classList.add('pill', attr);
                    pill.textContent = expandAbbrev(attr);
                    pill.addEventListener('click', highlightTiles(), false);

                    node.appendChild(pill);
                }

                function expandAbbrev(abbrev) {
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

                function capitalizeFirstLetter(string) {
                    return string[0].toUpperCase() + string.slice(1);
                }
            }

            function highlightTiles() {
                return function () {
                    // if no existing selection
                    if (this.classList.contains('selected') === false) {
                        let tiles = getAll('.tile');
                        let selectedPills = getAll('.' + this.classList[1]);

                        clearSelected();

                        tiles.forEach(tile => {
                            tile.classList.add('deselected');
                        });

                        selectedPills.forEach(pill => {
                            pill.classList.add('selected');
                            pill.closest('.tile').classList.remove('deselected');
                        });
                    }
                    // otherwise you're clicking a selected pill
                    else {
                        clearSelected();
                    }
                }

                function clearSelected() {
                    let selectedPills = getAll('.pill.selected');
                    let deselectedTiles = getAll('.deselected');

                    selectedPills.forEach(pill => pill.classList.remove('selected'));
                    deselectedTiles.forEach(tile => tile.classList.remove('deselected'));
                }
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