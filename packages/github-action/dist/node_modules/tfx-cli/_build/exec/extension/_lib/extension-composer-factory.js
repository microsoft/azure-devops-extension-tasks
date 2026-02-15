"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposerFactory = void 0;
const os_1 = require("os");
const composer_1 = require("./targets/Microsoft.VisualStudio.Services/composer");
const composer_2 = require("./targets/Microsoft.VisualStudio.Services.Integration/composer");
const composer_3 = require("./targets/Microsoft.VisualStudio.Offer/composer");
const _ = require("lodash");
const trace = require("../../../lib/trace");
class ComposerFactory {
    static GetComposer(settings, targets) {
        let composers = [];
        // @TODO: Targets should be declared by the composer
        targets.forEach(target => {
            switch (target.id) {
                case "Microsoft.VisualStudio.Services":
                case "Microsoft.VisualStudio.Services.Cloud":
                case "Microsoft.TeamFoundation.Server":
                    composers.push(new composer_1.VSSExtensionComposer(settings));
                    break;
                case "Microsoft.VisualStudio.Services.Integration":
                case "Microsoft.TeamFoundation.Server.Integration":
                case "Microsoft.VisualStudio.Services.Cloud.Integration":
                    composers.push(new composer_2.VSSIntegrationComposer(settings));
                    break;
                case "Microsoft.VisualStudio.Offer":
                    composers.push(new composer_3.VSOfferComposer(settings));
                    break;
                default:
                    if (!settings.bypassValidation) {
                        throw new Error("'" +
                            target.id +
                            "' is not a recognized target. Valid targets are 'Microsoft.VisualStudio.Services', 'Microsoft.VisualStudio.Services.Integration', 'Microsoft.VisualStudio.Offer'");
                    }
                    break;
            }
        });
        if (composers.length === 0 && targets.length === 0) {
            trace.warn(`No recognized targets found. Ensure that your manifest includes a target property. E.g. "targets":[{"id":"Microsoft.VisualStudio.Services"}],...${os_1.EOL}Defaulting to Microsoft.VisualStudio.Services`);
            composers.push(new composer_1.VSSExtensionComposer(settings));
        }
        // Build a new type of composer on the fly that is the
        // concatenation of all of the composers necessary for
        // this extension.
        let PolyComposer = (() => {
            function PolyComposer(settings) {
                this.settings = settings;
            }
            PolyComposer.prototype.getBuilders = () => {
                return _.uniqWith(composers.reduce((p, c) => {
                    return p.concat(c.getBuilders());
                }, []), (b1, b2) => b1.getType() === b2.getType());
            };
            PolyComposer.prototype.validate = (components) => {
                return Promise.all(composers.reduce((p, c) => {
                    return p.concat(c.validate(components));
                }, [])).then(multi => {
                    // flatten
                    return multi.reduce((p, c) => p.concat(c), []);
                });
            };
            return PolyComposer;
        })();
        return new PolyComposer(settings);
    }
}
exports.ComposerFactory = ComposerFactory;
//# sourceMappingURL=extension-composer-factory.js.map