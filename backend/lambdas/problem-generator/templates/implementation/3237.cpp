// BOJ - 3237 UHODE ( EC#3 - Problem 16 )

// eavesdropping: to listen to someone's private conversation without them knowing
// in such a fashion: 그런 방식으로~
// planar: having a flat or level surface that continues in all directions
// overhear: to hear what other people are saying without intending to and without their knowledge
// if and only if: <->

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    // I = east = right: x+, S = north = up: y+
    // Z = west = left: x-, J = south = down: y-

    int n, px = 0, py = 0; cin >> n;
    vector<pair<int, int> > v;
    int overheard[1001] = {0, };
    loop(i, 1, n) {
        int _x, _y; cin >> _x >> _y;
        v.push_back({_x, _y});
    }
    int dx[9] = {0, -1, 0, 1, -1, 1, -1, 0, 1}; // the same position as the task masters or other eight adjacent positions
    int dy[9] = {0, 1, 1, 1, 0, 0, -1, -1, -1};

    int k, flg = 0; cin >> k;
    string cmd; cin >> cmd; cmd = " " + cmd;

    for(char ch : cmd) {
        if(ch == ' ') px += 0, py += 0;
        else if(ch == 'I') px += 1, py += 0;
        else if(ch == 'S') px += 0, py += 1;
        else if(ch == 'Z') px -= 1, py += 0;
        else if(ch == 'J') px += 0, py -= 1;
        loop(i, 0, 8) {
            int nx = px + dx[i], ny = py + dy[i];
            for(int j = 0; j < n; j++) {
                if(v[j].first == nx && v[j].second == ny && !overheard[j]) {
                    overheard[j] = 1; flg = 1;
                }
            }
        }
    }

    if(!flg) cout << "-1\n";
    else loop(i, 0, n - 1) if(overheard[i]) cout << i + 1 << '\n';
}