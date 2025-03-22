// BOJ - 30924 A + B - 10 (제2편)

// BOJ - 30017 A + B - 10 (제1편)

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    random_device rd;
    mt19937 gen(rd());
    uniform_int_distribution<int> dis(1, 10000);
    ll resp; set<ll> as, bs;
    loop(a, 1, 10000) {
        ap:;
        ll n = dis(gen);
        if(!as.insert(n).second) goto ap;
        cout << "? A " << n << endl;
        cin >> resp;

        if(resp == 1) {
            loop(b, 1, 10000) {
                bp:;
                ll n2 = dis(gen);
                if(!bs.insert(n2).second) goto bp;
                cout << "? B " << n2 << endl;
                cin >> resp;
                if(resp == 1) {
                    cout << "! " << (n + n2) << endl;
                    return 0;
                }
            }
        }
    }
}