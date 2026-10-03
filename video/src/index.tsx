import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {BoutLaunch} from './Launch';
import timeline from './timeline.json';

const Root = () => <Composition id="BoutLaunch" component={BoutLaunch} width={1920} height={1080} fps={timeline.fps} durationInFrames={timeline.duration * timeline.fps} />;
registerRoot(Root);
