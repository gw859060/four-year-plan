(function () {
    'use strict';

    function get(selector, scope = document) {
        return scope.querySelector(selector);
    }

    function getAll(selector, scope = document) {
        return scope.querySelectorAll(selector);
    }

    function fetchData() {
        let base = 'https://gw859060.github.io/four-year-plan/data/';
        let files = ['requirements.json', 'courses.json'];
        let promises = [];

        for (let file of files) {
            promises.push(
                fetch(base + file).then(response => {
                    if (response.ok) {
                        return response.json();
                    } else {
                        throw new Error(`HTTP ${response.status}: ${file} failed to load.`);
                    }
                })
                .catch(error => {
                    if (!get('.tile.error')) {
                        let warning = document.createElement('div');

                        warning.classList.add('tile', 'dark', 'error');
                        warning.textContent = 'Parts of this page failed to load. Click here to try again.';
                        warning.addEventListener('click', () => { window.location.reload(); });
                        get('main').appendChild(warning);
                    }

                    console.error(error);
                })
            );
        }

        Promise.all(promises).then(data => {
            let requirements = data[0];
            let courses = createCourses(data[1]);

            buildNavigation();
            buildRequirements(requirements);
            fillRequirements(courses);
            buildSchedule(courses);
            buildUndated(courses);
            buildSummary(courses);
        })
        .catch(console.log);
    }

    function createCourses(json) {
        let courseObjects = [];

        // anything with dates (standard four-year sequence)
        for (let year of json.years) {
            for (let semester of year.semesters) {
                for (let course of semester.courses) {
                    let obj = new Course(
                        course.subject,
                        course.number,
                        course.name,
                        course.requirement,
                        course.attribute,
                        course.credits,
                        course.times,
                        year.year,
                        semester.semester
                    );

                    courseObjects.push(obj);
                }
            }
        }

        // anything without dates (AP credit, transfer courses, etc)
        for (let course of json.other) {
            let obj = new Course(
                course.subject,
                course.number,
                course.name,
                course.requirement,
                course.attribute,
                course.credits,
                // null = will never have a time; undefined (from above loop) = may get a time in the future
                null,
                null,
                null
            );

            courseObjects.push(obj);
        }

        return courseObjects;
    }

    function Course(subject, number, title, requirement, attribute, credits, times, year, semester) {
        this.name = {
            'subject': subject,
            'number': number,
            'title': title,
            'shorthand': subject + ' ' + number,
            'id': subject + '-' + number
        };
        this.reqs = {
            'requirement': requirement,
            'attribute': attribute
        };
        this.credits = credits;
        this.times = times;
        this.year = year;
        this.semester = semester;
        this.tooltip = function () {
            let tooltip = document.createElement('div');
            let header = document.createElement('div');
            let details = document.createElement('div');

            header.classList.add('tooltip-title');
            header.textContent = this.name.title;

            // add season and year this course is being taken
            // don't do this for courses without dates, eg. AP credits or transfer courses
            if (this.times !== null) {
                let startYear = 2020;
                let calendarYear = startYear + this.year;

                // if it's the fall or winter semester, we haven't ticked over to the next year yet
                // (assuming student started in the fall), so subtract 1 from calendarYear
                // for example, fall semester of year 1 is not 2020 + 1 = 2021, but 2020 + 0 = 2020
                if (expandSeason(this.semester) === 'Fall' || expandSeason(this.semester) === 'Winter') {
                    calendarYear -= 1;
                }

                details.classList.add('tooltip-details', 'subdued');
                details.textContent = `${expandSeason(this.semester)} ${calendarYear} • Year ${this.year}`;
            }

            tooltip.classList.add('tooltip', 'tile', 'dark');
            tooltip.id = this.name.id + '-tooltip'; // used with aria-describedby in fillRequirements
            tooltip.appendChild(header);
            tooltip.appendChild(details);

            return tooltip;
        };
        this.tile = function () {
            let template = get('.template-course').content.cloneNode(true),
                courseNode = get('.course', template),
                shortNode = get('.course-shorthand', template),
                shortNodeAlt = get('.course-shorthand-alt', template),
                titleNode = get('.course-name', template),
                reqContainer = get('.req-container', template),
                creditsNode = get('.course-credits', template);

            courseNode.id = this.name.id;
            shortNode.textContent = this.name.shorthand;
            shortNodeAlt.textContent = this.name.shorthand + ' ';
            linkTitle(titleNode, this);
            addPills(reqContainer, this);
            creditsNode.textContent = this.credits + ' cr.';

            return template;
        };
    }

    function buildNavigation() {
        let nav = get('nav');
        let links = getAll('.nav-link');

        for (let link of links) {
            link.addEventListener('click', function () {
                let section = link.dataset.section;
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                get('.' + section).scrollIntoView({ behavior: motion });
            }, false);
        }

        // add transition-delay values to nav items
        let delay = 85;

        getAll('.nav-item').forEach(item => {
            item.style.transitionDelay = delay + 'ms';
            delay += 85;
        });

        // handle opening/closing nav via menu button
        get('.nav-button').addEventListener('click', function (event) {
            // if open, close nav
            if (nav.classList.contains('show-menu')) {
                nav.classList.remove('show-menu');
                this.setAttribute('aria-expanded', false);
            }
            // if closed, open nav
            else {
                nav.classList.add('show-menu');
                this.setAttribute('aria-expanded', true);

                nav.addEventListener('keydown', function (event) {
                    // close nav when Esc is pressed
                    if (event.key === 'Escape') nav.classList.remove('show-menu');

                    // @TODO: move focus between items with arrow keys
                    // <https://www.smashingmagazine.com/2017/11/building-accessible-menu-systems/>
                    // § "Keyboard And Focus Behavior"
                }, { passive: true });

                // close nav when focus leaves it or its children (eg. by tabbing out)
                nav.addEventListener('focusout', function (event) {
                    // if newly focused element is still in nav, ignore the event
                    if (nav.contains(event.relatedTarget)) return;

                    nav.classList.remove('show-menu');
                }, { passive: true });

                // click outside nav to close
                document.addEventListener('click', function clickOutside(event) {
                    if (!event.target.closest('nav')) {
                        nav.classList.remove('show-menu');
                        document.removeEventListener('click', clickOutside, { passive: true });
                    }
                }, { passive: true });
            }
        }, { passive: true });
    }

    function buildRequirements(json) {
        /* ***** gen eds ***** */
        let geneds = json.gened[0];
        let genedTypes = ['academic', 'distributive', 'additional'];

        for (let type of genedTypes) {
            geneds[type].forEach((attr, i) => {
                let parentNode = get('.section-gened .' + type);

                buildAttrRow(attr, parentNode, i);
            });
        }

        /* ***** major ***** */
        let major = json.major[0];
        let majorTypes = ['core', 'electives', 'additional'];

        for (let type of majorTypes) {
            major[type].forEach((attr, i) => {
                let parentNode = get('.section-major .' + type);

                buildAttrRow(attr, parentNode, i);
            });
        }

        /* ***** minor ***** */
        let minor = json.minor[0];

        // only one attr in each section so no need for forloop
        buildAttrRow(minor.core, get('.section-minor .core'), 0);
        buildAttrRow(minor.electives, get('.section-minor .electives'), 0);

        function buildAttrRow(attr, parentNode, i) {
            let attrTemplate = get('.template-attribute').content.cloneNode(true);
            let nameNode = get('.attribute-name', attrTemplate);
            let courseNode = get('.attribute-course', attrTemplate);

            if (i !== 0) parentNode.appendChild(document.createElement('hr'));

            get('.attribute', attrTemplate).classList.add(attr.attribute);
            nameNode.textContent = expandAbbrev(attr.attribute);
            courseNode.textContent = '—';
            parentNode.appendChild(attrTemplate);

            // handle requirements that require more than one course
            if (attr.number !== 1) {
                let numberNode = document.createElement('span');

                numberNode.classList.add('subdued');
                numberNode.textContent = ' (' + attr.number + ')';
                nameNode.appendChild(numberNode);

                // create remaining rows
                let rowCount = attr.number - 1;

                while (rowCount > 0) {
                    let attrTemplate = get('.template-attribute').content.cloneNode(true);
                    let courseNode = get('.attribute-course', attrTemplate);

                    get('.attribute', attrTemplate).classList.add(attr.attribute);
                    courseNode.textContent = '—';
                    parentNode.appendChild(attrTemplate);
                    rowCount--;
                }
            }
        }
    }

    function fillRequirements(courses) {
        /* ***** fill in courses ***** */
        for (let course of courses) {
            let requirement = course.reqs.requirement;
            let attribute = course.reqs.attribute;

            // if course is "free" and doesn't meet any requirements, skip it
            if (requirement === 'other') continue;

            // if course meets multiple requirements, eg. CSC 301 is major and gen ed
            if (typeof requirement === 'object') {
                requirement.forEach((req, i) => {
                    let reqNode = get(`.section-${req} .attribute.${attribute[i]} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // if course meets multiple attributes, eg. GEO 204 is interdisciplinary and diverse
            else if (typeof attribute === 'object') {
                attribute.forEach(attr => {
                    let reqNode = get(`.section-${requirement} .attribute.${attr} .attribute-course`);

                    addRow(course, reqNode);
                });
            }
            // otherwise course has a single requirement/attribute pair
            else {
                let reqNode = get(`.section-${requirement} .attribute.${attribute} .attribute-course`);

                addRow(course, reqNode);
            }
        }

        function addRow(course, node) {
            // if attribute is already filled, skip and move to the next one
            while (node.textContent !== '—') {
                node = get('.attribute-course', node.parentNode.nextElementSibling);
            }

            let button = document.createElement('button');

            button.classList.add('attribute-course', 'monospace', 'uppercase', 'linked');
            button.setAttribute('aria-describedby', course.name.id + '-tooltip');
            button.setAttribute('type', 'button');
            button.textContent = course.name.shorthand;
            addTooltip(course, button);
            node.parentNode.appendChild(button);

            // replace div with button so empty courses are skipped when tabbing through
            node.remove();

            // on click, jump to course schedule and highlight the course
            button.addEventListener('click', function () {
                let clickedCourse = get('#' + course.name.id);
                let motion = (window.matchMedia('(prefers-reduced-motion)').matches) ? 'auto' : 'smooth';

                clickedCourse.classList.add('highlighted');

                // disable existing transition property on .pill when jumping to course
                get('.req-container', clickedCourse).classList.add('no-fade');

                // @TODO: <https://css-tricks.com/smooth-scrolling-accessibility/>
                //        problem: setting focus as instructed makes the browser jump to target immediately,
                //        skipping the smooth scroll behavior; alternatively, just remove smooth scroll
                let parentHeader = get('.semester-num', clickedCourse.parentNode);

                // all courses in "Course Schedule" section
                if (parentHeader) {
                    parentHeader.scrollIntoView({ behavior: motion });
                }
                // all courses in "Undated Courses" section (no semester header)
                else {
                    clickedCourse.parentNode.scrollIntoView({ behavior: motion });
                }

                window.setTimeout(function () {
                    get('.req-container', clickedCourse).classList.remove('no-fade');
                    clickedCourse.classList.remove('highlighted');
                    clickedCourse.classList.add('fade-out');
                }, 1500);

                window.setTimeout(function () {
                    clickedCourse.classList.remove('fade-out');
                }, 3000);
            }, false);
        }

        function addTooltip(course, attrNode) {
            let tooltip = course.tooltip();

            ['mouseenter', 'touchstart', 'focus'].forEach(event => {
                attrNode.addEventListener(event, function (e) {
                    e.currentTarget.appendChild(tooltip);
                    repositionTooltip(tooltip);
                }, { passive: true });
            });

            ['mouseleave', 'touchend', 'blur'].forEach(event => {
                attrNode.addEventListener(event, function (e) {
                    if (e.currentTarget.contains(tooltip)) {
                        e.currentTarget.removeChild(tooltip);
                    }
                }, { passive: true });
            });
        }
    }

    // @TODO: use CourseLeaf API?
    //        <https://catalog.wcupa.edu/js/courseleaf.js>
    //        <https://stackoverflow.com/questions/5031501/how-to-rate-limit-ajax-requests>
    //        Examples:
    //            <https://catalog.wcupa.edu/ribbit/?page=getcourse.rjs&code=CSC+142>
    //            <https://catalog.wcupa.edu/ribbit/?page=getcourse.rjs&subject=CSC>
    //            <https://catalog.wcupa.edu/ribbit/?page=getcourse.rjs&department=CSC>
    //            <https://catalog.wcupa.edu/ribbit/?page=getprogram.rjs&name=*Computer*>
    //        CORS workaround:
    //            <https://app.cors.bridged.cc/>
    //            <https://medium.com/bridgedxyz/cors-anywhere-for-everyone-free-reliable-cors-proxy-service-73507192714e>

    function buildSchedule(courses) {
        // starting year for "Fall 2020" headers; I know it's a bad name
        let semesterYear = 2020;

        // get list of year numbers (most likely 1, 2, 3, 4)
        let yearList = [];

        for (let course of courses) {
            // don't build DOM for "other" array in courses.json - dates for those courses are set to null
            if (course.year === null) continue;
            if (yearList.includes(course.year) === false) yearList.push(course.year);
        }

        // start building year structure
        for (let year of yearList) {
            // create empty year section
            let yearNode = document.createElement('section');

            yearNode.classList.add('year');
            get('.course-schedule').appendChild(yearNode);

            // get list of semester numbers (most likely 1, 2) for given year
            let semList = [];

            for (let course of courses.filter(c => c.year === year)) {
                if (semList.includes(course.semester) === false) semList.push(course.semester);
            }

            // fill year with semesters
            for (let semester of semList) {
                let courseList = courses.filter(c => c.year === year).filter(c => c.semester === semester);

                // create empty semester section
                let semTemplate = get('.template-semester').content.cloneNode(true),
                    semNode = get('.semester', semTemplate),
                    semHeader = get('.semester-num', semTemplate),
                    season = expandSeason(semester);

                semHeader.innerHTML = `${season} ${semesterYear} <span class="subdued">Year ${year}</span>`;

                // fill semester with courses
                for (let course of courseList) {
                    semNode.appendChild(course.tile());
                }

                // check if at least one course in the semester has course times before building week view
                for (let course of courseList) {
                    if (typeof course.times === 'object') {
                        buildWeek(semNode, courseList);
                        break;
                    }
                }

                // only add row-gap if summer/winter semesters exist; if the gap is constantly "on", it creates
                // inconsistent vertical spacing because the gap doesn't collapse when there is no second row
                if (semester > 2 && !yearNode.classList.contains('year-row-gap')) {
                    yearNode.classList.add('year-row-gap');
                }

                // if it's the fall semester (and assuming fall start), it's a new year
                if (semester === 1) semesterYear++;

                yearNode.appendChild(semTemplate);
            }

            // handle keyboard accessibility for pills
            getAll('.req-container').forEach(container => {
                container.focus = 0;
                container.elements = getAll('.pill', container);

                // ignore courses without pills (ie. courses that don't fill any requirements)
                if (container.elements.length > 0) {
                    container.elements[0].setAttribute('tabindex', 0); // all pills are initially set to -1
                }

                container.addEventListener('keydown', makeAccessible);
            });
        }

        function buildWeek(container, courses) {
            let weekTemplate = get('.template-week').content.cloneNode(true);

            container.appendChild(weekTemplate);

            // figure out earliest and latest hours for the week so we only show minimum necessary
            let earliestHour = 24;
            let latestHour = 0;

            for (let course of courses) {
                // skip courses without times
                if (typeof course.times !== 'object') continue;

                for (let time of course.times) {
                    let startHour = parseInt(time.start.split(':')[0], 10),
                        endHour = parseInt(time.end.split(':')[0], 10),
                        endMin = parseInt(time.end.split(':')[1], 10);

                    if (startHour < earliestHour) {
                        earliestHour = startHour;
                    }

                    if (endHour > latestHour) {
                        latestHour = endHour;

                        // if XX:15, for example, round up to the next hour
                        if (endMin !== 0) {
                            latestHour++;
                        }
                    }
                }
            }

            // create headers
            let totalHours = latestHour - earliestHour;
            let hourNum = earliestHour;
            let gridLineRow = 1; // css grid line naming starts at 1, not 0

            for (let i = 0; i < totalHours; i++) {
                // create hour headers
                let hourHeader = document.createElement('div');

                // convert to 12-hour time
                if (hourNum > 12) hourNum -= 12;

                hourHeader.classList.add('header-hour');
                hourHeader.textContent = hourNum + ':00';
                hourNum++;
                get('.header-hours', container).appendChild(hourHeader);

                // fake the last hour header
                if (i + 1 === totalHours) {
                    hourHeader.dataset.nextHour = hourNum + ':00';
                }

                // create hourly grid lines
                let hourLine = document.createElement('div');

                hourLine.classList.add('hour-line');
                hourLine.style.gridRow = gridLineRow + ' / ' + (gridLineRow + 12); // 12 rows = 1 hr
                gridLineRow += 12;
                get('.week-grid', container).appendChild(hourLine);
            }

            // add course slots to weekly schedule
            for (let course of courses) {
                // skip courses without times
                if (typeof course.times !== 'object') continue;

                addTimes(container, course, courses.indexOf(course), earliestHour);
            }

            // add .today class to current day of the week
            // @TODO: only for current semester? would require setting semester start/end dates
            let dayHeaders = getAll('.header-day', container);
            let todayNum = new Date().getDay();
            let todayNode = dayHeaders[todayNum - 1]; // subtract 1 because week starts on monday, not sunday

            // skip days that don't exist (ie. the weekend)
            if (todayNode) {
                todayNode.classList.add('today');
                todayNode.setAttribute('aria-label', todayNode.getAttribute('aria-label') + ' (today)');
            }

            // set css variable for use in .header-hours and .week-grid
            get('.week-container', container).style.setProperty('--total-hours', totalHours);

            // listen for click and also open schedules in adjacent semesters (directly to
            // the left or right), primarily so mobile doesn't have huge layout shift
            let weekButton = get('.week-button', container);

            weekButton.addEventListener('click', function (e) {
                let semesters = getAll('.semester', e.target.closest('.year'));
                let targetPos = e.target.closest('.semester').getBoundingClientRect().top;

                for (let semester of semesters) {
                    let schedule = get('.weekly-schedule', semester);
                    let semesterPos = semester.getBoundingClientRect().top;

                    // if semester doesn't contain a weekly schedule, skip it
                    if (!schedule) continue;

                    // filter semesters to ones with the same y-position as the target semester,
                    // and exclude the target schedule (it's already been toggled by click)
                    if ((semesterPos === targetPos) && (schedule !== e.target.parentNode)) {
                        schedule.toggleAttribute('open');
                    }
                }
            }, { passive: true });
        }

        function addTimes(container, course, i, earliestHour) {
            let times = course.times;

            // add time slots for this course to the grid
            for (let time of times) {
                let bgClasses = ['bg-red', 'bg-orange', 'bg-green', 'bg-blue', 'bg-purple'];
                let courseNode = document.createElement('div');

                courseNode.setAttribute('tabindex', '0'); // allow users to tab through
                courseNode.setAttribute('aria-describedby', course.name.id + '-tooltip');
                courseNode.classList.add('course-slot', 'monospace', 'uppercase', bgClasses[i]);
                courseNode.textContent = course.name.shorthand;
                courseNode.style.gridRow = convertToRow(time.start) + '/' + convertToRow(time.end);
                courseNode.style.gridColumn = convertToColumn(time.day);
                addTooltip(courseNode, course, time);

                get('.week-grid', container).appendChild(courseNode);
            }

            function buildTooltip(course, time) {
                let tooltip = document.createElement('div');

                tooltip.classList.add('tooltip', 'tile', 'dark');
                tooltip.id = course.name.id + '-tooltip'; // used with aria-describedby

                // add course name
                let header = document.createElement('div');

                header.classList.add('tooltip-title');
                header.textContent = course.name.title;
                tooltip.appendChild(header);

                // add start time, end time, and course duration
                let details = document.createElement('div');

                let minutes = (convertToRow(time.end) - convertToRow(time.start)) * 5,
                    hours = Math.floor(minutes / 60);

                if (hours === 0) {
                    hours = '';
                } else {
                    hours += 'hr ';
                }

                let startHour = time.start.split(':')[0],
                    startMin = time.start.split(':')[1],
                    startPeriod = checkPeriod(startHour),
                    endHour = time.end.split(':')[0],
                    endMin = time.end.split(':')[1],
                    endPeriod = checkPeriod(endHour);

                let convertedStart = `${convertHour(startHour)}:${startMin} ${startPeriod}`,
                    convertedEnd = `${convertHour(endHour)}:${endMin} ${endPeriod}`;

                details.classList.add('tooltip-details', 'subdued');
                details.textContent = `${convertedStart}–${convertedEnd} • ${hours}${minutes % 60}m`;
                tooltip.appendChild(details);

                return tooltip;

                // convert 24-hour time to 12-hour time
                function convertHour(hour) {
                    if (hour > 12) {
                        return hour -= 12;
                    } else {
                        return hour;
                    }
                }

                // check if AM or PM
                function checkPeriod(hour) {
                    if (hour >= 12) {
                        return 'pm';
                    } else {
                        return 'am';
                    }
                }
            }

            // @TODO: combine the code for this and the Course object's tooltip
            function addTooltip(node, course, time) {
                let tooltip = buildTooltip(course, time);

                ['mouseenter', 'touchstart', 'focus'].forEach(event => {
                    node.addEventListener(event, function (e) {
                        e.currentTarget.appendChild(tooltip);
                        repositionTooltip(tooltip);
                    }, { passive: true });
                });

                ['mouseleave', 'touchend', 'blur'].forEach(event => {
                    node.addEventListener(event, function (e) {
                        // some weird interaction where clicking slot and then clicking away produces error
                        if (e.currentTarget.contains(tooltip)) {
                            e.currentTarget.removeChild(tooltip);
                        }
                    }, { passive: true });
                });
            }

            function convertToRow(time) {
                let timeSplit = time.split(':'),
                    hour = timeSplit[0],
                    min = timeSplit[1];

                // convert course start/end time to its number of 5-minute intervals for grid placement;
                // add 1 because grid line naming starts at 1, not 0
                let rowNum = ((hour - earliestHour) * 12 + 1) + (min / 5);

                return rowNum;
            }

            function convertToColumn(day) {
                switch (day) {
                    case 'M':
                        return 1;
                    case 'T':
                        return 2;
                    case 'W':
                        return 3;
                    case 'R':
                        return 4;
                    case 'F':
                        return 5;
                }
            }
        }
    }

    function buildUndated(courses) {
        let filteredCourses = courses.filter(course => course.times === null);

        for (let course of filteredCourses) {
            get('.undated-courses-container').appendChild(course.tile());
        }
    }

    function buildSummary(courses) {
        // subtotals for requirement types
        let reqTypes = ['gened', 'major', 'minor', 'other'];

        for (let type of reqTypes) {
            let filteredCourses = courses.filter(course => course.reqs.requirement.includes(type));
            let courseSubtotal = 0;
            let creditSubtotal = 0;

            for (let course of filteredCourses) {
                courseSubtotal += 1;
                creditSubtotal += course.credits;
            }

            // fill in subtotals
            let courseNode = get(`.summary .courses .${type} .attribute-course`);
            let creditNode = get(`.summary .credits .${type} .attribute-course`);

            courseNode.textContent = courseSubtotal;
            creditNode.textContent = creditSubtotal;
        }

        // totals
        let creditTotal = 0;

        for (let course of courses) {
            creditTotal += course.credits;
        }

        let courseNode = get(`.summary .courses .total .attribute-course`);
        let creditNode = get(`.summary .credits .total .attribute-course`);

        courseNode.textContent = courses.length; // don't count overlap between types
        creditNode.textContent = creditTotal;
    }

    function linkTitle(container, course) {
        let link = document.createElement('a');

        link.classList.add('course-link');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener');
        link.setAttribute('title', `See description in WCUPA Course Catalog`);
        link.href = `https://catalog.wcupa.edu/search/?P=${course.name.subject}+${course.name.number}`;
        link.textContent = course.name.title;
        container.appendChild(link);
    }

    function addPills(container, course) {
        let requirement = course.reqs.requirement;
        let attribute = course.reqs.attribute;

        // skip courses that don't meet any attributes
        // @TODO: replace with some text like "no requirements" to maintain the same height
        if (requirement === 'other') {
            container.classList.add('no-reqs');
            container.textContent = 'None';
            return;
        }

        // if course meets multiple requirements
        // eg. CSC 301 is major and gen ed
        if (typeof requirement === 'object') {
            requirement.forEach((req, i) => {
                buildPill(container, req, attribute[i]);
            });
        }
        // if course meets multiple attributes
        // eg. GEO 204 is i and j
        else if (typeof attribute === 'object') {
            attribute.forEach((attr, i) => {
                if (i === 0) {
                    buildPill(container, requirement, attr);
                }
                // only add remaining attr, not a duplicate requirement + attr
                // eg. GEO 204 should show [gened] [i] [j] instead of [gened] [i] [gened] [j]
                else {
                    buildPill(container, requirement, attr, true);
                }
            });
        } else {
            buildPill(container, requirement, attribute);
        }

        // fade out pills if they overflow the container
        let reqObserver = new ResizeObserver(entry => {
            let el = entry[0];

            if (el.target.scrollWidth > el.target.offsetWidth) {
                el.target.classList.add('fade-overflow');
            } else if (el.target.classList.contains('fade-overflow')) {
                el.target.classList.remove('fade-overflow');
            }
        });

        reqObserver.observe(container);

        function buildPill(container, req, attr, duplicate = false) {
            for (let type of [req, attr]) {
                // skip duplicate requirements
                if (type === req && duplicate === true) {
                    continue;
                }

                let pill = document.createElement('button');
                // separate attributes with the same name that appear in multiple reqs
                // (eg. core in both major/minor) by making attr classes more specific
                let typeClass = (type === attr) ? `${req}-${type}` : type;

                pill.classList.add('pill', typeClass);
                pill.textContent = expandAbbrev(type);
                pill.setAttribute('type', 'button');
                pill.setAttribute('tabindex', '-1');
                pill.addEventListener('click', function (e) {
                    // highlight courses with same req/attr, fade all others
                    if (e.target.classList.contains('selected') === false) {
                        clearSelectedPills();

                        let years = getAll('.year');
                        let selectedPills = getAll('.pill.' + this.classList[1]);

                        // for "Course Schedule" section
                        for (let year of years) year.classList.add('filtered');
                        // for "Undated Courses" section
                        get('.undated-courses-container').classList.add('filtered');

                        for (let pill of selectedPills) {
                            pill.classList.add('selected');
                            pill.closest('.course').classList.add('selected');
                        }
                    }
                    // else if clicked pill is already selected, clear selection
                    else {
                        clearSelectedPills();
                    }
                }, false);

                container.appendChild(pill);
            }

            function clearSelectedPills() {
                getAll('.selected').forEach(el => el.classList.remove('selected'));
                getAll('.filtered').forEach(el => el.classList.remove('filtered'));
            }
        }
    }

    function makeAccessible(event) {
        let target = event.currentTarget,
            elements = target.elements,
            key = event.key;

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            event.preventDefault(); // stop page from scrolling with arrow keys
            elements[target.focus].setAttribute('tabindex', -1);

            // move to next element
            if (['ArrowDown', 'ArrowRight'].includes(key)) {
                target.focus++;

                // if at the end, move to the start
                if (target.focus >= elements.length) {
                    target.focus = 0;
                }
            }
            // move to previous element
            else if (['ArrowUp', 'ArrowLeft'].includes(key)) {
                target.focus--;

                // if at the start, move to the end
                if (target.focus < 0) {
                    target.focus = elements.length - 1;
                }
            }

            elements[target.focus].setAttribute('tabindex', 0);
            elements[target.focus].focus();
        }
    }

    function repositionTooltip(tooltip) {
        let parentWidth = tooltip.parentNode.offsetWidth;
        let padLeft = parseFloat(window.getComputedStyle(tooltip).getPropertyValue('padding-left'));
        let intersect = new IntersectionObserver(entries => {
            let entry = entries[0];
            let overflow = 0;

            if (entry.intersectionRatio < 1) {
                overflow = entry.intersectionRect.right - entry.boundingClientRect.right;
            }

            // move tooltip body while keeping arrow centered over hovered element
            // @TODO: fix tooltip "jumping" when it appears on Chrome and Firefox
            let arrowPos = (overflow * -1) + (parentWidth / 2) - (padLeft / 2);

            entry.target.style.left = overflow + 'px';
            entry.target.style.setProperty('--arrow-pos', arrowPos + 'px');
        }, { rootMargin: '0px -15px 0px 0px' });

        intersect.observe(tooltip);
    }

    function expandAbbrev(abbrev) {
        switch (abbrev) {
            case 'gened':
                return 'Gen Ed';
            case 'fye':
                return 'First Year Experience';
            case 'social':
                return 'Behav. & Social Science';
            case 'math':
                return 'Mathematics';
            case 'english':
                return 'English Composition';
            case 'writing':
                return 'Writing Emphasis';
            case 'speaking':
                return 'Speaking Emphasis';
            case 'i':
                return 'Interdisciplinary';
            case 'j':
                return 'Diverse Communities';
            case 'complex':
                return 'Complex Large-Scale Systems';
            default:
                // capitalize first letter
                return abbrev[0].toUpperCase() + abbrev.slice(1);
        }
    }

    function expandSeason(semester) {
        switch (semester) {
            case 1:
                return 'Fall';
            case 2:
                return 'Spring';
            case 3:
                return 'Winter';
            case 4:
                return 'Summer 1';
            case 5:
                return 'Summer 2';
        }
    }

    // remove class that hides content when js is not enabled
    get('html').classList.remove('no-js');

    fetchData();
}());