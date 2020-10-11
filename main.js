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

                    semesterHeader.innerHTML = 'Semester ' + semesterNum + ' <span class="subdued">' + season + ' 2020</span>';

                    /* ***** COURSES ***** */

                    let courses = semester.courses;
                    let creditTotal = 0;

                    courses.forEach(course => {
                        let courseTemplate = get('.template-course').content.cloneNode(true);
                        let shorthandNode = get('.course-shorthand', courseTemplate);
                        let fullnameNode = get('.course-name', courseTemplate);
                        let reqContainer = get('.req-container', courseTemplate);
                        let creditsNode = get('.course-credits', courseTemplate);

                        createCatalogLink(shorthandNode, course.subject, course.number);
                        fullnameNode.textContent = course.name;
                        handleReq(reqContainer, course.requirement);
                        handleReq(reqContainer, course.attribute);
                        creditsNode.textContent = course.credits + ' cr.';
                        creditTotal += course.credits;

                        semesterSection.appendChild(courseTemplate);
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

                link.classList.add('shorthand-link', 'subdued');
                link.setAttribute('target', '_blank');
                link.setAttribute('ref', 'noopener');
                link.setAttribute('title', `View ${subject} ${number} in catalog on wcupa.edu`);
                link.href = `https://catalog.wcupa.edu/search/?P=${subject}+${number}`;
                link.innerHTML = subject + '<br />' + number;
                node.appendChild(link);
            }

            function handleReq(node, abbrev) {
                // if course contains multiple attributes
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
                    // if current target is not already selected
                    if (this.classList.contains('selected') === false) {
                        let courses = getAll('.tile.course');
                        let selectedPills = getAll('.pill.' + this.classList[1]);

                        // clear existing selections before highlighting new ones
                        clearSelected();

                        courses.forEach(course => {
                            course.classList.add('deselected');
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
                    let deselectedCourses = getAll('.deselected');

                    selectedPills.forEach(pill => pill.classList.remove('selected'));
                    deselectedCourses.forEach(course => course.classList.remove('deselected'));
                }
            }
        }

        function cleanUp() {
            get('noscript').remove();
            getAll('template').forEach(template => template.remove());
        }
    }

    initPlan();
})(), false);