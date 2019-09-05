// src/App.js

import React, { Component } from 'react';

import {BrowserRouter as Router, Route, NavLink} from 'react-router-dom';
import { Divider, Form, Grid, Header, Input, List, Segment } from 'semantic-ui-react';
import {v4 as uuid} from 'uuid';

import { Connect, S3Image, withAuthenticator } from 'aws-amplify-react';
import Amplify, { API, Auth, graphqlOperation, Storage } from 'aws-amplify';

import aws_exports from './aws-exports';
Amplify.configure(aws_exports);

function makeComparator(key, order='asc') {
    return (a, b) => {
        if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) return 0;

        const aVal = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
        const bVal = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

        return order === 'desc' ? (comparison * -1) : comparison
    };
}


const ListRecords = `query ListRecords {
    listRecords(limit: 9999) {
        items {
            id
            description
            createdAt
        }
    }
}`;

const SubscribeToNewRecords = `
  subscription OnCreateRecord {
    onCreateRecord {
      id
      description
    }
  }
`;


const GetRecord = `query GetRecord($id: ID!, $nextTokenForPhotos: String) {
    getRecord(id: $id) {
    id
    description
    photos(sortDirection: DESC, nextToken: $nextTokenForPhotos) {
      nextToken
      items {
        thumbnail {
          width
          height
          key
        }
      }
    }
  }
}
`;

class S3ImageUpload extends React.Component {
    constructor(props) {
        super(props);
        this.state = { uploading: false }
    }

    uploadFile = async (file) => {
        const fileName = uuid();
        const user = await Auth.currentAuthenticatedUser();

        const result = await Storage.put(
            fileName,
            file,
            {
                customPrefix: { public: 'uploads/' },
                metadata: { recordId: this.props.recordId, owner: user.username }
            }
        );

        console.log('Uploaded file: ', result);
    }

    onChange = async (e) => {
        this.setState({uploading: true});

        let files = [];
        for (var i=0; i<e.target.files.length; i++) {
            files.push(e.target.files.item(i));
        }
        await Promise.all(files.map(f => this.uploadFile(f)));

        this.setState({uploading: false});
    }

    render() {
        return (
            <div>
                <Form.Button
                    onClick={() => document.getElementById('add-image-file-input').click()}
                    disabled={this.state.uploading}
                    icon='file image outline'
                    content={ this.state.uploading ? 'Uploading...' : 'Add Images' }
                />
                <input
                    id='add-image-file-input'
                    type="file"
                    accept='image/*'
                    multiple
                    onChange={this.onChange}
                    style={{ display: 'none' }}
                />
            </div>
        );
    }
}


class PhotosList extends React.Component {
    photoItems() {
        return this.props.photos.map(photo =>
            <S3Image
                key={photo.thumbnail.key}
                imgKey={photo.thumbnail.key.replace('public/', '')}
                style={{display: 'inline-block', 'paddingRight': '5px'}}
            />
        );
    }

    render() {
        return (
            <div>
                <Divider hidden />
                {this.photoItems()}
            </div>
        );
    }
}

class NewRecord extends Component {
    constructor(props) {
        super(props);
        this.state = {
            recordDesc: ''
        };
    }

    handleChange = (event) => {
        let change = {};
        change[event.target.name] = event.target.value;
        this.setState(change);
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        const NewRecord = `mutation description($name: String) {
      createRecord(input: {description: $name}) {
        id
        description
      }
    }`;

        const result = await API.graphql(graphqlOperation(NewRecord, { name: this.state.recordDesc }));
        console.info(`Created record with id ${result.data.createRecord.id}`);
        this.setState({ recordDesc: '' })
    }

    render() {
        return (
            <Segment>
                <Header as='h3'>Report an incident/risk/hazard</Header>
                <Input
                    type='text'
                    placeholder='Record description'
                    icon='plus'
                    iconPosition='left'
                    action={{ content: 'Submit', onClick: this.handleSubmit }}
                    name='recordDesc'
                    value={this.state.recordDesc}
                    onChange={this.handleChange}
                />
            </Segment>
        )
    }
}


class RecordsList extends React.Component {
    recordItems() {
        return this.props.records.sort(makeComparator('createdAt')).map(record =>
            <List.Item key={record.id}>
                <NavLink to={`/records/${record.id}`}>{record.description}</NavLink>
            </List.Item>
        );
    }

    render() {
        return (
            <Segment>
                <Header as='h3'>Reported</Header>
                <List divided relaxed>
                    {this.recordItems()}
                </List>
            </Segment>
        );
    }
}


class RecordDetailsLoader extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            nextTokenForPhotos: null,
            hasMorePhotos: true,
            record: null,
            loading: true
        }
    }


    async loadMorePhotos() {
        if (!this.state.hasMorePhotos) return;
        console.log(this.props);
        console.log(this.state);
        this.setState({ loading: true });
        const { data } = await API.graphql(graphqlOperation(GetRecord, {id: this.props.id, nextTokenForPhotos: this.state.nextTokenForPhotos}));

        let record;
        if (this.state.record === null) {
            record = data.getRecord;
        } else {
            record = this.state.record;
            record.photos.items = record.photos.items.concat(data.getRecord.photos.items);
        }
        this.setState({
            record: record,
            loading: false,
            nextTokenForPhotos: data.getRecord.photos.nextToken,
            hasMorePhotos: data.getRecord.photos.nextToken !== null
        });
    }

    componentDidMount() {
        this.loadMorePhotos();
    }

    render() {
        return (
            <RecordDetails
                loadingPhotos={this.state.loading}
                record={this.state.record}
                loadMorePhotos={this.loadMorePhotos.bind(this)}
                hasMorePhotos={this.state.hasMorePhotos}
            />
        );
    }
}


class RecordDetails extends Component {
    render() {
        if (!this.props.record) return 'Loading record...';

        return (
            <Segment>
                <Header as='h3'>{this.props.record.description}</Header>
                <S3ImageUpload recordId={this.props.record.id}/>
                <PhotosList photos={this.props.record.photos.items} />
                {
                    this.props.hasMorePhotos &&
                    <Form.Button
                        onClick={this.props.loadMorePhotos}
                        icon='refresh'
                        disabled={this.props.loadingPhotos}
                        content={this.props.loadingPhotos ? 'Loading...' : 'Load more photos'}
                    />
                }
            </Segment>
        )
    }
}


class RecordsListLoader extends React.Component {
    onNewRecord = (prevQuery, newData) => {
        // When we get data about a new record, we need to put in into an object
        // with the same shape as the original query results, but with the new data added as well
        let updatedQuery = Object.assign({}, prevQuery);
        updatedQuery.listRecords.items = prevQuery.listRecords.items.concat([newData.onCreateRecord]);
        return updatedQuery;
    }

    render() {
        return (
            <Connect
                query={graphqlOperation(ListRecords)}
                subscription={graphqlOperation(SubscribeToNewRecords)}
                onSubscriptionMsg={this.onNewRecord}
            >
                {({ data, loading }) => {
                    if (loading) { return <div>Loading...</div>; }
                    if (!data.listRecords) return;

                    return <RecordsList records={data.listRecords.items} />;
                }}
            </Connect>
        );
    }
}


class App extends Component {
    render() {
        return (
            <Router>
                <Grid padded>
                    <Grid.Column>
                        <Route path="/" exact component={NewRecord}/>
                        <Route path="/" exact component={RecordsListLoader}/>

                        <Route
                            path="/records/:recordId"
                            render={ () => <div><NavLink to='/'>Back to all reported</NavLink></div> }
                        />
                        <Route
                            path="/records/:recordId"
                            render={ props => <RecordDetailsLoader id={props.match.params.recordId}/> }
                        />
                    </Grid.Column>
                </Grid>
            </Router>
        );
    }
}

export default withAuthenticator(App, {includeGreetings: true});
