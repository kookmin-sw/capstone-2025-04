// BOJ - 17479 정식당 ( EC#3 - Problem 20 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll a, b, c; cin >> a >> b >> c;
    map<string, pair<ll, ll> > mm;
    loop(i, 1, a) {
        string ss; ll price; cin >> ss >> price;
        mm[ss] = {price, 0};
    }
    loop(i, 1, b) {
        string ss; ll price; cin >> ss >> price;
        mm[ss] = {price, 1};
    }
    loop(i, 1, c) {
        string ss; cin >> ss;
        mm[ss] = {0, 2};
    }
    ll order; cin >> order;
    ll ao = 0, bo = 0, co = 0;
    while(order--) {
        string ss; cin >> ss;
        pair<ll, ll> pii = mm[ss];
        if(pii.second == 0) ao += pii.first;
        if(pii.second == 1) bo += pii.first;
        if(pii.second == 2) {
            if(!co) co = 1;
            else {
                cout << "No\n"; return 0;
            }
        }
    }

    if(co && !bo && ao + bo >= 50000) cout << "Okay\n";
    else if(co && bo && ao >= 20000 && ao + bo >= 50000) cout << "Okay\n";
    else if(!co && bo && ao >= 20000) cout << "Okay\n";
    else if(!co && !bo) cout << "Okay\n";
    else cout << "No\n";
}