import { Nitrate } from '@Nitrate';
import { SceneRegistry } from './scene/SceneRegistry';

export class App {
    public Start(): void {
        new Nitrate.DataPersistenceManager();
        new Nitrate.SceneManager(SceneRegistry);
    }
}
