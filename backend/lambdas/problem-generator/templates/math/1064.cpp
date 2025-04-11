// BOJ - 1064 평행사변형

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
// CCW: https://snowfleur.tistory.com/98 참조
// if A(x1, y1), B(x2, y2), C(x3, y3)
// CA x AB
double ccw(double x1, double y1, double x2, double y2, double x3, double y3) {
    return (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1); // 외적
}
double dist(double x1, double y1, double x2, double y2) {
    return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    cout << fixed;
    cout.precision(13);
 
    double ax, ay, bx, by, cx, cy; cin >> ax >> ay >> bx >> by >> cx >> cy;
    
    double maxv = 0.0, minv = 99999999.0;

    int flag = 0;

    double cab = ccw(ax, ay, bx, by, cx, cy);
    if(cab != 0.0) {
        double ca = dist(cx, cy, ax, ay), ab = dist(ax, ay, bx, by);
        double perimeter = (ca + ab) * 2;
        maxv = max(maxv, perimeter);
        minv = min(minv, perimeter);
        flag = 1;
    }

    double acb = ccw(cx, cy, bx, by, ax, ay);
    if(acb != 0.0) {
        double ac = dist(ax, ay, cx, cy), cb = dist(cx, cy, bx, by);
        double perimeter = (ac + cb) * 2;
        maxv = max(maxv, perimeter);
        minv = min(minv, perimeter);
        flag = 1;
    }

    double cba = ccw(bx, by, ax, ay, cx, cy);
    if(cba != 0.0) {
        double cb = dist(cx, cy, bx, by), ba = dist(bx, by, ax, ay);
        double perimeter = (cb + ba) * 2;
        maxv = max(maxv, perimeter);
        minv = min(minv, perimeter);
        flag = 1;
    }

    if(!flag) cout << "-1.0\n";
    else cout << abs(maxv - minv) << '\n';
}