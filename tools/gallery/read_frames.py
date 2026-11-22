import base64
import re
from html.parser import HTMLParser


class EmbeddedPhotos(HTMLParser):
    def __init__(self, directory):
        super().__init__()
        self.directory = directory
        self.key = None
        self.count = 0

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if tag == 'figure':
            self.key = fields.get('data-frame')
        elif tag == 'img' and self.key:
            if not re.fullmatch(r'[a-z][a-z-]*', self.key):
                raise ValueError('Invalid gallery frame name')
            header, payload = fields['src'].split(',', 1)
            extension = {'data:image/png;base64':'.png','data:image/jpeg;base64':'.jpg'}[header]
            file = self.directory / (self.key+extension)
            if not file.exists():
                file.write_bytes(base64.b64decode(payload, validate=True))
            self.count += 1

    def handle_endtag(self, tag):
        if tag == 'figure':
            self.key = None


def unpack_missing(page, frames):
    frames.mkdir(parents=True, exist_ok=True)
    if page.is_file():
        parser = EmbeddedPhotos(frames)
        parser.feed(page.read_text(encoding='utf-8'))
        parser.close()
        if parser.count != 13:
            raise ValueError('Expected thirteen master images in the published gallery.')
