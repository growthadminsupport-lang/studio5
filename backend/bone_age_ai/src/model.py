from torchvision.models import efficientnet_b3, efficientnet_b5, efficientnet_b7, EfficientNet_B3_Weights, EfficientNet_B5_Weights, EfficientNet_B7_Weights
import torch.nn as nn
import torch

class BoneAgeModel(nn.Module):
    def __init__(self, backbone="b3", pretrained=True) -> None:
        super().__init__()

        # load pretrained backbone
        builders = {"b3": (efficientnet_b3, EfficientNet_B3_Weights.DEFAULT),
                    "b5": (efficientnet_b5, EfficientNet_B5_Weights.DEFAULT),
                    "b7": (efficientnet_b7, EfficientNet_B7_Weights.DEFAULT)}
        if backbone not in builders:
            raise ValueError(f"Unsupported backbone: {backbone}")
        builder, weights = builders[backbone]
        self.backbone = builder(weights=weights if pretrained else None)

        # remove the original classifier
        # replace it with 'do nothing' (identity), so backbone just outputs 1280 features
        in_features = self.backbone.classifier[1].in_features
        #.classifier[1] is a linear layer that maps the pooled feature vector to the original 1000 imgs class
        #.classifier[0] is the dropout layer
        self.backbone.classifier[1] = nn.Identity()

        # create the head that combines img feature(1280) + gender(1)
        #custom head
        self.regressor = nn.Sequential(
            nn.Linear(in_features + 1, 128),
            nn.ReLU(),
            nn.Linear(128, 1)  # output: single number -> bone age
        )

    def forward(self, img, gender):
        '''
        -Get the img and gender
        -the dim of both aint the same, need to fix that first
        '''

        img_feature = self.backbone(img)  # shape: [32, 1280]
        gender = gender.unsqueeze(1)  # shape: [32, 1]
        # unsqueeze: adds a new dim to a tensor na
        combined = torch.cat([img_feature, gender], dim=1)
        # torch.cat is used to combine 2 vectors together
        # where dim=0 is row combination and dim=1 is col combination
        out = self.regressor(combined)  # <-- was self.head, now matches __init__

        return out.squeeze(1)

if __name__ == "__main__":
    model = BoneAgeModel()

    fake_img = torch.randn(4, 3, 224, 224)  # matched to EfficientNet-B0's expected input size
    fake_gender = torch.tensor([0.0, 1.0, 1.0, 0.0])

    output = model(fake_img, fake_gender)
    print(output.shape)
    print(output)
