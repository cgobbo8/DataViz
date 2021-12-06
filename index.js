//#region Constantes
let scene;
let camera;
let renderer;
let lineMesh;
let geometryLine = null;
let geometryPoint = null;
let minX;
let maxX;
let minY;
let maxY;
let minZ;
let maxZ;
let particuleMesh;
let pointMesh;
let time = 0;
let particlesSelected = true;
let manipulationAllowed = true;
let materialImage;
let geometryImage;
let planeImage;
const dotSize = 20;
const maxAltitude = 16500;
const minAltitude = 0;
let minValue = minAltitude;
let maxValue = maxAltitude;
const particlesSpeed = 200;
let cpt = 0;
let n = 5;
var globalPositions = [];
let vols = [];
let controls;

const color1 = new ColorClass(255, 0, 0);
const color2 = new ColorClass(0, 0, 255);

//#endregion

//#region Classes
/**
 * @class Color class
 * @param {Number} r Red : Value between 0 and 255
 * @param {Number} g Green : Value between 0 and 255 
 * @param {Number} b Blue : Value between 0 and 255 
 */
function ColorClass(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
}

/**
 * @classdesc Class representing a Flight with its own properties
 * @param {Number} id1 Id of current trajectoire
 * @param {Date} time Time of the trajectoire
 * @param {Number} normalizedX Position X of the trajectoire normalized
 * @param {Number} normalizedY Position Y of the trajectoire normalized
 * @param {Number} normalizedZ Position Z of the trajectoire normalized
 * @param {Number} x Position X of the trajectoire
 * @param {Number} y Position Y of the trajectoire
 * @param {Number} z Position Z of the trajectoire
 * @param {String} name Anonymous name of the trajectoire
 * @param {Number} id2 Id of the next trajectoire
 */
function Vol(id1, time, normalizedX, normalizedY, normalizedZ, x, y, z, name, id2) {
    this.id1 = id1;
    this.time = time;
    this.normalizedX = normalizedX;
    this.normalizedY = normalizedY;
    this.normalizedZ = normalizedZ;
    this.x = x;
    this.y = y;
    this.z = z;
    this.name = name;
    this.id2 = id2;
}

/**
 * @class Class reprensenting a rectangle and its properties
 * @param {Number} x Position x
 * @param {Number} y Position y
 * @param {Number} width Width
 * @param {Number} height Height
 * @param {CanvasRenderingContext2DSettings} context Contexte du canvas
 * @param {HTMLCanvasElement} canvas Canvas
 * @param {string} color Shape color 
 */
function Rectangle(x, y, width, height, context, canvas, color = "red") {
    this.x = x;
    this.y = y;
    this.width = width
    this.height = height
    this.context = context;
    this.color = color;
    this.canvas = canvas;

    this.draw = function() {
        if (this.x + this.width > this.canvas.width) {
            this.width = this.canvas.width - this.x;
        }
        if (this.x < 0) {
            this.x = 0;
        }
        this.context.fillStyle = this.color;

        this.context.fillRect(this.x, this.y, this.width, this.height);

    }


    this.isIn = function(posX, posY) {
        return this.x < posX && posX < this.x + this.width && this.y < posY && posY < this.y + this.height;
    }
}
//#endregion

//#region Utilities functions

/**
 * Normalize a value between a min and a max
 * @param {Number} val 
 * @param {Number} max 
 * @param {Number} min 
 * @returns 
 */
function normalize(val, max, min) { return (val - min) / (max - min); }


/**
 * Interpolate between two colors
 * @param {Color} c1 
 * @param {Color} c2 
 * @param {Number} val 
 * @returns 
 */
function interpolateColor(c1, c2, val) {
    let r, g, b;
    r = c1.r + (c2.r - c1.r) * val;
    g = c1.g + (c2.g - c1.g) * val;
    b = c1.b + (c2.b - c1.b) * val;
    return { r: r, g: g, b: b };
}


/**
 * convert degrees to radians
 * @param {Number} deg Degrees
 * @returns {Number} Radians
 */
function degToRad(deg) { return deg * Math.PI / 180; }

/**
 * get Flights which matche the altitude
 * @param {Array<Vol>} vols Flights Array
 * @param {Number} altitude1 
 * @param {Number} altitude2 
 * @param {Number} minZ 
 * @param {Number} maxZ 
 * @returns 
 */
function getVolsMatches(vols, altitude1, altitude2) {
    let indices = [];
    let altitudeMinimumNormalized = normalize(altitude1, 16500, 0)
    let altitudeMaximumNormalized = normalize(altitude2, 16500, 0)
    for (let i = 0; i < vols.length - 1; i++) {
        let current = vols[i];
        let next = vols[i + 1];
        if (current.id1 === next.id1 && (current.normalizedZ >= altitudeMinimumNormalized - 0.5 && current.normalizedZ <= altitudeMaximumNormalized - 0.5) && (next.normalizedZ >= altitudeMinimumNormalized - 0.5 && next.normalizedZ <= altitudeMaximumNormalized - 0.5)) {
            indices.push(i, i + 1);
        }
    }

    return indices;

}


//#endregion


function init() {

    // Create Scene
    scene = new Scene();
    scene.background = new Color(0x090005);

    // Create Camera
    let aspectRatio = window.innerWidth / window.innerHeight;
    camera = new OrthographicCamera(-0.7 * aspectRatio, 0.7 * aspectRatio, 0.7, -0.7, 0.001, 1000);
    scene.add(camera);
    camera.position.set(0, 0, 1.);
    camera.lookAt(new Vector3(0, 0, 0));


    // add event listener to highlight dragged objects


    // Create renderer
    renderer = new WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    let container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    let image = new Image();
    image.setAttribute('crossOrigin', 'anonymous');

    try {
        image.src = './france.jpg';
        image.onload = function() {
            let texture = new Texture(image);
            texture.needsUpdate = true;
            materialImage = new MeshBasicMaterial({ map: texture, opacity: 0.1, transparent: true });
            geometryImage = new PlaneGeometry(1, 1, 1, 1);
            planeImage = new Mesh(geometryImage, materialImage);
            planeImage.position.set(0, 0, -0.5);
            // zoom the image
            planeImage.scale.set(1.1, 1.1, 1.1);
            scene.add(planeImage);
        }
    } catch (e) {
        console.log(e);
    }


    // Load data from HTML
    loadTxt();



    // Init sliders
    initSlider(vols);



    document.addEventListener('wheel', function(e) {
        let delta = e.deltaY;
        if (delta > 0) {
            camera.zoom += 0.1;
        } else {
            camera.zoom -= 0.1;

        }
        camera.updateProjectionMatrix();
    });


    const manipulationDirectButton = document.querySelector('.manipulation-directe');
    let manipulationDirect = false;
    let manipulationOk = false;

    manipulationDirectButton.addEventListener('click', function() {
        if (!manipulationDirectButton.classList.contains('active')) {
            manipulationDirectButton.classList.add('active');
            manipulationDirectButton.innerHTML = 'Annuler manipulation directe';
            manipulationDirect = true;
        } else {
            manipulationDirectButton.classList.remove('active');
            manipulationDirectButton.innerHTML = 'Manipulation directe';
            manipulationDirect = false;
            camera.position.x = 0;
            camera.position.y = 0;
            camera.lookAt(new Vector3(0, 0, 0));
        }
    });

    document.addEventListener('mousedown', () => {
        if (manipulationAllowed) {
            manipulationOk = true;
        }
        if (manipulationDirect && manipulationAllowed) document.body.style.cursor = 'grabbing';
    })

    document.addEventListener('mouseup', () => {
        manipulationOk = false;
        if (manipulationDirect) document.body.style.cursor = 'default';
    })


    document.addEventListener('mousemove', function(e) {
        if (manipulationDirect && manipulationOk) {
            camera.position.x -= e.movementX / 1000;
            camera.position.y += e.movementY / 1000;
        }
    });

    const panelSlider = document.querySelector('.panel-sliders');

    panelSlider.addEventListener('mouseenter', function(e) {
        e.stopPropagation();
        manipulationAllowed = false;
    });

    panelSlider.addEventListener('mouseout', function(e) {
        e.stopPropagation();
        manipulationAllowed = true;
    });

    window.addEventListener('resize', onWindowResize);


    let particles = buildThreeJsDataPoints(scene);


    buildThreeJsData(scene);

    animate();



}

// update project matrix on resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


/**
 * Boucle de rendu qui s'exécutera chaque frame
 */
function animate() {
    // console.log(vols)
    requestAnimationFrame(animate);

    if (particlesSelected) {
        const positions = particuleMesh.geometry.attributes.position.array
        const colors = particuleMesh.geometry.attributes.color.array
        for (let i = 0; i < vols.length - 6; i++) {

            let newPositionX;
            let newPositionY;
            let newPositionZ;
            // console.log(minValue, maxValue);

            // console.log(vols[i].id1);

            let altitudeMinimumNormalized = normalize(minValue, maxAltitude, minAltitude);
            let altitudeMaximumNormalized = normalize(maxValue, maxAltitude, minAltitude);


            if ((time + vols[i].id1) % particlesSpeed === 0) {
                newPositionX = Number(vols[i].x);
                newPositionY = Number(vols[i].y);
                newPositionZ = Number(vols[i].z);
                // time = 0;
            } else {
                if (vols[i + 1].id1 === vols[i].id1) {
                    newPositionX = (Number(vols[i + 1].x) - Number(vols[i].x)) / particlesSpeed * ((time + vols[i].id1) % particlesSpeed) + Number(vols[i].x);
                    newPositionY = (Number(vols[i + 1].y) - Number(vols[i].y)) / particlesSpeed * ((time + vols[i].id1) % particlesSpeed) + Number(vols[i].y);
                    newPositionZ = (Number(vols[i + 1].z) - Number(vols[i].z)) / particlesSpeed * ((time + vols[i].id1) % particlesSpeed) + Number(vols[i].z);
                }
            }

            let normalizedX = (newPositionX - minX) / (maxX - minX) - 0.5;
            let normalizedY = (newPositionY - minY) / (maxY - minY) - 0.5;
            let normalizedZ = (newPositionZ - minZ) / (maxZ - minZ) - 0.5;

            // console.log(normalizedX, normalizedY, normalizedZ);

            if (altitudeMinimumNormalized - 0.5 <= normalizedZ && normalizedZ <= altitudeMaximumNormalized - 0.5) {
                positions[i * 3] = normalizedX;
                positions[i * 3 + 1] = normalizedY;
                positions[i * 3 + 2] = normalizedZ;
            } else {
                positions[i * 3] = -100;
                positions[i * 3 + 1] = -100;
                positions[i * 3 + 2] = -100;
            }



            // colors[i * 3] = Math.random() - 0.5 // r
            // colors[i * 3 + 1] = Math.random() - 0.5 // g
            // colors[i * 3 + 2] = Math.random() - 0.5 // b

            particuleMesh.geometry.attributes.position.needsUpdate = true;
            particuleMesh.geometry.attributes.position.needsUpdate = true;
        }

        time++;
    }


    renderer.render(scene, camera);

};


/**
 * Récupérer les informations des trajectoires
 */
function loadTxt() {

    let myDataStr = document.getElementById("myData").innerText;
    myDataStr = myDataStr.split('\n');

    // let vols = [];
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;
    minZ = Infinity;
    maxZ = -Infinity;

    // minimum and maximum affectations
    myDataStr.forEach(function(element) {
        let x = Number(element.split(';')[2]);
        minX = x < minX ? x : minX;
        maxX = x > maxX ? x : maxX;
        let y = Number(element.split(';')[3]);
        minY = y < minY ? y : minY;
        maxY = y > maxY ? y : maxY;
        let z = Number(element.split(';')[4]);
        minZ = z < minZ ? z : minZ;
        maxZ = z > maxZ ? z : maxZ;
    });

    // data set building from HTML data string
    myDataStr.forEach(function(element, index) {
        if (index !== 0) {
            let normalizedX = (Number(element.split(';')[2]) - minX) / (maxX - minX) - 0.5;
            let normalizedY = (Number(element.split(';')[3]) - minY) / (maxY - minY) - 0.5;
            let normalizedZ = (Number(element.split(';')[4]) - minZ) / (maxZ - minZ) - 0.5;

            vols.push(new Vol(
                Number(element.split(';')[0]),
                element.split(';')[1],
                normalizedX,
                normalizedY,
                normalizedZ,
                Number(element.split(';')[2]),
                Number(element.split(';')[3]),
                Number(element.split(';')[4]),
                element.split(';')[5],
                Number(element.split(';')[6])
            ));
        }
    });

    // return vols;
}


/**
 * Initialize all the sliders, with listeners and canvas creation
 * @param {Array<Vol>} data Flights Datas
 */
function initSlider() {

    // clean the data set


    // get the sliders from the HTML
    const sliderX = document.getElementById('input-range-x');
    const sliderY = document.getElementById('input-range-y');

    // canvas creation 
    const canvas = document.getElementById('range-slider');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 3, canvas.width, canvas.height - 5);

    // init some variables

    const minText = document.getElementById('min-range-value');
    const maxText = document.getElementById('max-range-value');
    let currentDot;
    let isClicked = false;
    let inCanvas = false;


    // creation of range slider components
    const Poignet1 = new Rectangle(0, canvas.height / 2 - dotSize / 2, dotSize, dotSize, ctx, canvas, "#0984e3");
    const Poignet2 = new Rectangle(canvas.width - dotSize, canvas.height / 2 - dotSize / 2, dotSize, dotSize, ctx, canvas, "#0984e3");
    const rangeRectangle = new Rectangle(Poignet1.x, 2, Poignet2.x - Poignet1.x, canvas.height - 4, ctx, canvas, "#74b9ff");

    rangeRectangle.draw();
    Poignet1.draw();
    Poignet2.draw();


    // listeners

    // X slider
    sliderX.addEventListener('input', (e) => {
        let rad = degToRad(e.target.value);
        lineMesh.rotation.x = -rad;
        particuleMesh.rotation.x = -rad;
        planeImage.position.sub(new Vector3(0, -0.5, -0.5));
        planeImage.rotation.x = -rad;
        planeImage.position.set(-(planeImage.rotation.y / Math.PI), planeImage.rotation.x / Math.PI, -0.5);
    });

    const inputs = document.querySelectorAll('input').forEach(input => {
        input.addEventListener('mousedown', () => {
            manipulationAllowed = false;
        })
        input.addEventListener('mouseup', () => {
            manipulationAllowed = true;
        })
    })

    // Y slider
    sliderY.addEventListener('input', (e) => {
        let rad = degToRad(e.target.value);
        lineMesh.rotation.y = -rad;
        particuleMesh.rotation.y = -rad;
        planeImage.rotation.y = -rad;
        planeImage.position.set(-(planeImage.rotation.y / Math.PI), planeImage.rotation.x / Math.PI, -0.5);
    });

    // Desactivate the slider when a click is released outside the canvas
    document.querySelector('body').addEventListener('mouseup', () => {
        isClicked = false;
    });

    // Activate the slider when a click is inside the canvas
    canvas.addEventListener('mousedown', e => {
        manipulationAllowed = false;
        if (Poignet1.isIn(e.layerX, e.layerY)) {
            currentDot = [Poignet1];
            isClicked = true;

        } else if (Poignet2.isIn(e.layerX, e.layerY)) {
            currentDot = [Poignet2];
            isClicked = true;

        } else {
            currentDot = null;
        }

    });

    // Desactivate the slider when a click is released
    canvas.addEventListener('mouseup', e => {
        isClicked = false;
        redraw(canvas, ctx, [Poignet1, Poignet2], '#74b9ff');
    });

    // Check if we are in the canvas
    canvas.addEventListener('mouseenter', e => {
        inCanvas = true;
    })

    // Check if we are out of the canvas
    canvas.addEventListener('mouseleave', e => {
        inCanvas = false;
    })

    // Calculate the new position of the slider when the mouse is moved
    document.addEventListener('mousemove', e => {

        const canvasBounds = canvas.getBoundingClientRect();

        if (isClicked && !(e.clientX > canvasBounds.right || e.clientX < canvasBounds.left)) {
            if (currentDot[0].x > -1) {
                currentDot[0].x = inCanvas ? e.layerX : e.layerX - canvas.getBoundingClientRect().left;
            } else {
                currentDot[0].x = 0
            }

            if (currentDot[0].x < 201 - dotSize) {
                currentDot[0].x = inCanvas ? e.layerX : e.layerX - canvas.getBoundingClientRect().left;
            } else {
                currentDot[0].x = 200 - dotSize;
            }

            redraw(canvas, ctx, [Poignet1, Poignet2], '#341f97');

            minValue = rangeRectangle.x * maxAltitude / canvas.width >= 0 ? rangeRectangle.x * maxAltitude / canvas.width : 0;
            maxValue = (Math.max(Poignet1.x, Poignet2.x) + dotSize) * maxAltitude / canvas.width <= 16500 ? (Math.max(Poignet1.x, Poignet2.x) + dotSize) * maxAltitude / canvas.width : 16500;
            minText.innerHTML = `${Math.floor(minValue)}m`
            maxText.innerHTML = `${Math.floor(maxValue)}m`

            let newIndices = getVolsMatches(vols, Number(minValue), Number(maxValue), minZ, maxZ);
            geometryLine.setIndex(newIndices);
        };
    })

    /**
     * Call every draw function on the dotList elements
     * @param {HTMLCanvasElement} canvas 
     * @param {CanvasRenderingContext2D} context 
     * @param {Array} dotList 
     * @param {Color} rectangleColor 
     */
    function redraw(canvas, context, dotList, rectangleColor) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 3, canvas.width, canvas.height - 5);
        rangeRectangle.x = Math.min(Poignet1.x, Poignet2.x);
        rangeRectangle.width = Math.abs(Poignet1.x - Poignet2.x);
        rangeRectangle.color = rectangleColor;
        rangeRectangle.draw();
        dotList.forEach(dot => {
            dot.draw();
        })
    }


}

/**
 * create the 3D component and add it to the scene
 * @param {Array<Vol>} data Array of flights
 * @param {Scene} scene ThreeJS Scene
 */
function buildThreeJsData(scene) {


    geometryLine = new BufferGeometry();
    let material = new LineBasicMaterial({
        transparent: true,
        opacity: 0.2,
        vertexColors: true,
        blending: AdditiveBlending,
    });
    let positions = [];
    let colors = [];
    let indices = [];


    for (let i = 0; i < vols.length - 1; i++) {
        let current = vols[i];
        let next = vols[i + 1];

        if (current.id1 == next.id1) {
            indices.push(i, i + 1);
        }

        positions.push(current.normalizedX, current.normalizedY, current.normalizedZ);
        let interpolationCurrent = interpolateColor(color1, color2, current.normalizedZ + 0.5);
        colors.push(normalize(interpolationCurrent.r, 255, 0), normalize(interpolationCurrent.g, 255, 0), normalize(interpolationCurrent.b, 255, 0));
    }


    geometryLine.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometryLine.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometryLine.setIndex(indices);

    lineMesh = new LineSegments(geometryLine, material);

    // if (particlesSelected) {
    //     lineMesh.visible = false;
    // } else {
    //     lineMesh.visible = true;
    // }

    scene.add(lineMesh);
}




/**
 * create the 3D component and add it to the scene
 * @param {Array<Vol>} data Array of flights
 * @param {Scene} scene ThreeJS Scene
 */
function buildThreeJsDataPoints(scene) {


    geometryPoint = new BufferGeometry();
    let material = new PointsMaterial({
        size: 1,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: AdditiveBlending,
    });
    let positions = [];
    let colors = [];

    for (let i = 0; i < vols.length; i++) {
        let current = vols[i];

        positions.push(current.normalizedX, current.normalizedY, current.normalizedZ);
        let interpolationCurrent = interpolateColor(color1, color2, current.normalizedZ + 0.5);
        colors.push(normalize(interpolationCurrent.r, 255, 0), normalize(interpolationCurrent.g, 255, 0), normalize(interpolationCurrent.b, 255, 0));
    }


    geometryPoint.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometryPoint.setAttribute('color', new Float32BufferAttribute(colors, 3));

    particuleMesh = new Points(geometryPoint, material);

    scene.add(particuleMesh);

    // if (particlesSelected) {
    //     particuleMesh.visible = true;
    // } else {
    //     particuleMesh.visible = false;
    // }
    globalPositions = [...particuleMesh.geometry.attributes.position.array];

}


let checkboxs = document.getElementsByName('checkbox');

// check checkbox button
for (let i = 0; i < checkboxs.length; i++) {
    checkboxs[i].addEventListener('change', e => {
        if (e.target.value == 'particles') {
            if (e.target.checked) {
                particlesSelected = true;
                particuleMesh.visible = true;
            } else {
                particlesSelected = false;
                particuleMesh.visible = false;
            }
        } else {
            if (e.target.checked) {
                lineMesh.visible = true;
            } else {
                lineMesh.visible = false;
            }
        }
    })
}


document.getElementById('seeConsignes').addEventListener('click', e => {

    let modal = document.getElementById('modal');
    let overlay = document.getElementById('overlay');
    modal.classList.add('show');
    overlay.classList.add('show');

    overlay.addEventListener('click', e => {
        modal.classList.remove('show');
        overlay.classList.remove('show');
    })

})


function rotateAboutPoint(obj, point, axis, theta, pointIsWorld) {
    pointIsWorld = (pointIsWorld === undefined) ? false : pointIsWorld;

    if (pointIsWorld) {
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if (pointIsWorld) {
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}