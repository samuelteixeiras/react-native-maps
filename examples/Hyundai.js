var React = require('react-native');
var {
  StyleSheet,
  PropTypes,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
} = React;

var MapView = require('../components/MapView');
var LatLon = require('geodesy').LatLonEllipsoidal;
var PriceMarker = require('./AnimatedPriceMarker');

var { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const MOCK_INTERVAL = 500;
const TWEEN_CAR = true;
const LATITUDE = 37.78825;
const LONGITUDE = -122.4324;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
let id = 0;

var Hyundai = React.createClass({
  getInitialState() {
    return {
      region: {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      markers: [
        { key: 'saddr', coordinate: {latitude: 34.1036520, longitude: -118.2980330}},
        { key: 'daddr', coordinate: {latitude: 34.145785, longitude: -118.258443}},
      ],
      polyline: [],
      car: {
        key: 'car',
        coordinate: {latitude: 34.1036520, longitude: -118.2980330}
      },
      direction: 0,
      rotation: 0,
    };
  },
  componentDidMount: function() {
    this.getDirections().then((result) => {
      // console.log('Direction Results', result)
      let { origin, destination } = result;
      let bounds = {
        dLon: destination.geometry.coordinates[1],
        dLat: destination.geometry.coordinates[0],
        oLon: origin.geometry.coordinates[1],
        oLat: origin.geometry.coordinates[0],
      };

      let polyline = result.routes[0].geometry.coordinates.map(c => {
        return {
          latitude: c[1],
          longitude: c[0],
        }
      });

      this.setState({polyline: polyline});
      this.refs.mapview.fitToElements(false);

    }).catch((err) => {
      console.log('Error getting Directions', err)
    });
  },

  getDirections() {
    return new Promise((resolve, reject) => {
      fetch(`https://api.mapbox.com/v4/directions/mapbox.driving/-118.2980330,34.1036520;-118.258443,34.145785.json?geojson=true&access_token=pk.eyJ1IjoiYm9iYnlzdWQiLCJhIjoiTi16MElIUSJ9.Clrqck--7WmHeqqvtFdYig`)
      .then((response) => {
        return response.json();
      }).then((json) => {
        resolve(json);
      }).catch((err) => {
      reject(err);
      });
    });
  },

  calculateDirection(last, next) {
    let lastPoint = new LatLon(last.latitude, last.longitude);
    let nextPoint = new LatLon(next.latitude, next.longitude);
    return lastPoint.finalBearingTo(nextPoint);
  },

  startJourney() {
    console.log('start jouney')
    let startMarker = this.state.markers.find(a => a.key === 'saddr');
    let endMarker = this.state.markers.find(a => a.key === 'daddr');
    let polyline = this.state.polyline;

    let timer = 0;

    let nextCoordinateIndex = 0;
    let nextCoordinate = null;
    let lastCoordinate = polyline[0];

    let intervalStartTime = Date.now()
    let tween = (c) => {
      if (nextCoordinateIndex < polyline.length + 1 && this.isMounted()) requestAnimationFrame(tween);
      if (!nextCoordinate || !lastCoordinate) return;
      let deltaLat = nextCoordinate.latitude - lastCoordinate.latitude;
      let deltaLong = nextCoordinate.longitude - lastCoordinate.longitude;
      let scale = (Date.now() - intervalStartTime)/MOCK_INTERVAL;
      let car = this.state.car
      car.coordinate = {longitude: lastCoordinate.longitude + deltaLong*scale, latitude: lastCoordinate.latitude + deltaLat*scale};
      if(this.isMounted()) this.setState({car: {...car}})
    }

    if (this.state.polyline) {
      this.state.polyline.forEach((c, i) => {
        // lastCoordinate = c;
        setTimeout(() => {

          // tween vars
          lastCoordinate = c;
          nextCoordinate = this.state.polyline[i + 1];
          nextCoordinateIndex++;
          intervalStartTime = Date.now();

          let direction = (lastCoordinate && nextCoordinate) ? this.calculateDirection(lastCoordinate, nextCoordinate) : 0;
          console.log(`Moving to coordinate: ${c.latitude}, ${c.longitude}. Direction ${direction}`);

          this.setState({
            rotation: direction,
            car:
              {
                coordinate: c,
                key: 'car',
              },

          });
        }, timer += MOCK_INTERVAL);
      });
      if (TWEEN_CAR) tween() // start tween
    }
  },

  render() {
    console.log('Rendering');
    return (
      <View style={styles.container}>
        <MapView
          rotateEnabled={false}
          zoomEnabled={false}
          ref="mapview"
          style={styles.map}
        >
          {this.state.markers.map(marker => (
            <MapView.Marker
              key={marker.key}
              coordinate={marker.coordinate}
            />
          ))}
          <MapView.Marker
            ref="car"
            image={require('./car.png')}
            style={{transform: [{rotate: `${this.state.rotation}deg`}]}}
            key={this.state.car.key}
            coordinate={this.state.car.coordinate}
          />
          <MapView.Polyline
            coordinates={this.state.polyline}
            strokeColor="rgba(0,0,200,0.5"
            strokeWidth={5}
          />
        </MapView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={this.startJourney} style={styles.bubble}>
            <Text>Start Journey</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
});

var styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
});

module.exports = Hyundai;
